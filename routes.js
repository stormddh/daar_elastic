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

async function setup_index () {
    await elasticClient.indices.create({
      index: 'cv_index',
      body: {
        mappings: {
          properties: {
            first_name: { type: 'keyword' },
            last_name: { type: 'keyword' },
            file_name: { type: 'text' },
            content: { type: 'text' },
          }
        }
      }
    }, { ignore: [400] })
}

setup_index().catch(console.log)

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

router.post('/cv', upload.single("cvFile"), (req, res) => {
    //parse PDF to raw .txt file
    const pdfParser = new PDFParser(this, 1);
    let first_name = req.body.firstName;
    let last_name = req.body.lastName;
    let file_name = first_name + "_" + last_name + "_" + "CV_parsed_raw.content.txt"
    let pdf_name = req.file.path.split("/")[1]

    pdfParser.on("pdfParser_dataError", errData => {
        console.error(errData.parserError);
    })
    .on("pdfParser_dataReady", pdfData => {
        let cv_content = pdfParser.getRawTextContent();
        let body = {
            first_name: first_name,
            last_name: last_name,
            file_name: pdf_name,
            content: cv_content,
        }

        fs.writeFile("uploads/" + file_name, cv_content, () => {
            console.log(file_name + " file upload done.");
        });

        elasticClient.index({
            index: 'cv_index',
            body: body,
        })
        .then(resp => {
            return res.status(200).json({
                msg: "Your CV has been uploaded to the database! ",
            });
        })
        .catch(err => {
            return res.status(500).json({
                msg: 'Error',
                err
            });
        });
    });
    pdfParser.loadPDF(req.file.path);

    //cleanUpDirectory(req).then(r => console.log("Directory cleaned."))
});

router.get('/cv/:file', (req, res) => {
    let file_name = req.params.file
    let cv_path = "uploads/" + file_name

    if (fs.existsSync(cv_path)) {
        res.contentType("application/pdf");
        fs.createReadStream(cv_path).pipe(res)
    } else {
        res.status(500)
        console.log('File not found')
        res.send('File not found')
    }
});

router.get('/cv', (req, res) => {
    if (req.query.search) {
        elasticClient.search({
            index: 'cv_index',
            body: {
                query: {
                    match: {
                        content: req.query.search,
                    }
                }
            }
        })
        .then(resp => {
            return res.status(200).json({
                cv: resp.body.hits.hits
            });
        })
        .catch(err => {
            return res.status(500).json({
                msg: 'SEARCH: Error',
                error: err,
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