//require('array.prototype.flatmap').shim()

const express = require('express');
const router = express.Router();

const bodyParser = require('body-parser').json();

const { Client } = require('@elastic/elasticsearch');
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

async function run () {
    await elasticClient.indices.create({
      index: 'example_index',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            viewed_time: { type: 'integer' },
            words_number: { type: 'integer' },
            author: { type: 'text' },
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
  
    const { body: count } = await elasticClient.count({ index: 'example_index' })
    console.log(count)
}

run().catch(console.log)

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

router.post('/articles', bodyParser, (req, res) => {
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
        id: req.params.title
    }
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
    if (req.query.search) query.q = req.query.search;
    //console.log(query);
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
});

module.exports = router;