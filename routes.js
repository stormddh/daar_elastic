//require('array.prototype.flatmap').shim()

const express = require('express');
const router = express.Router();
const multer = require('multer')
const fs = require('fs'),
    PDFParser = require("pdf2json");


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "--" + file.originalname);
    }
});

let upload = multer({storage: storage});


const bodyParser = require('body-parser').json();

const {Client} = require('@elastic/elasticsearch');
const elasticClient = new Client({
    node: 'http://localhost:9200',
});

elasticClient.ping(
    {
        requestTimeout: 30000,
    },
    function (error) {
        if (error) {
            console.error('Elasticsearch cluster is down!');
            console.error(error);
        } else {
            console.log('Everything is okay.');
        }
    }
);

async function import_data () {
    await elasticClient.indices.create({
      index: 'example_index',
      body: {
        mappings: {
          properties: {
            title: { type: 'keyword' },
            viewed_time: { type: 'integer' },
            words_number: { type: 'integer' },
            author: { type: 'keyword' },
            content: { type: 'text' }, 
          }
        }
      }
    }, { ignore: [400] })
  
    const articles = require('./articles.json'); 
  
    const body = articles.flatMap(doc => [{ index: { _index: 'example_index' } }, doc])
  
    const { body: bulkResponse } = await elasticClient.bulk({ refresh: true, body })
  
    if (bulkResponse.errors) {
      const erroredDocuments = []
      // The items array has the same order of the dataset we just indexed.
      // The presence of the `error` key indicates that the operation
      // that we did for the document has failed.
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0]
        if (action[operation].error) {
          erroredDocuments.push({
            // If the status is 429 it means that you can retry the document,
            // otherwise it's very likely a mapping error, and you should
            // fix the document before to try it again.
            status: action[operation].status,
            error: action[operation].error,
            operation: body[i * 2],
            document: body[i * 2 + 1]
          })
        }
      })
      console.log(erroredDocuments)
    }
  
    const { body: count } = await elasticClient.count({ index: 'example_index' });
}

import_data().catch(console.log)

router.use((req, res, next) => {
    elasticClient.index({
        index: 'logs',
        body: {
            url: req.url,
            method: req.method,
        }
    })
    .then(res => {
        console.log('Logs indexed');
    })
    .catch(err => {
        console.log(err);
    })
    next();
});

router.post('/articles', upload.single("cvFile"), (req, res) => {
    //parse PDF to raw .txt file
    const pdfParser = new PDFParser(this, 1);
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", pdfData => {
        let fileName = req.body.firstName + "_" + req.body.lastName + "_" + "CV_parsed_raw.content.txt"
        fs.writeFile("uploads/" + fileName, pdfParser.getRawTextContent(), () => {
            console.log(fileName + " file upload done.");
        });
    });
    pdfParser.loadPDF(req.file.path);

    cleanUpDirectory(req).then(r => console.log("Directory cleaned."))

    return res.json({
        msg: "Your CV has been uploaded to the database! ",
        data: req.file,
    });
    elasticClient.index({
        index: 'example_index',
        body: req.body,
    })
    .then(resp => {
        return res.status(200).json({
            msg: 'article added',
        });
    })
    .catch(err => {
        return res.status(500).json({
            msg: 'Error',
            err
        });
    });
});

router.get('/articles/:title', (req, res) => {
    let query = {
        index: 'example_index',
        title: req.params.title
    }
    let applicants = [ "Patryk Fussek", "Elvis Presley", "Tony Vlcek", "Adrian Bucka", "Elsa Lopez", "Carlo Segat", "Duc Huy Do"]

    return res.json({
        msg: "Hello, this is a list of applicants for the given query: " + req.params.title,
        applicants: applicants
    });
    elasticClient.get(query)
    .then(resp => {
        if(!resp) {
            return res.status(404).json({
                msg: 'Not found'
            });
        }
        return res.status(200).json({
            product: resp
        });
    })
    .catch(err => {
        return res.status(500).json({
            msg: 'Error',
            err
        });
    });
});


router.get('/articles', (req, res) => {
    let query = {
        index: 'example_index',
    }
    if (req.query.search) {
        query.q = "(${req.query.search})";
        return res.json({
            msg: "Hello, this API is responding for GET request",
        });
        elasticClient.search(query)
        .then(resp => {
            return res.status(200).json({
                articles: resp.hits.hits
            });
        })
        .catch(err => {
            return res.status(500).json({
                msg: 'SEARCH: Error',
                err
            });
        });
    } else {
        return res.status(200).json({
            msg: 'No result',
        });
    }
});

async function cleanUpDirectory(req) {
    setTimeout(function () {
        const fs = require("fs")
        const pathToFile = req.file.path

        fs.unlink(pathToFile, function (err) {
            if (err) {
                throw err
            }
        })
    }, 100);
}

module.exports = router;