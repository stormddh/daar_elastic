const express = require('express');

const router = express.Router();

const elastic = require('elasticsearch');

const bodyParser = require('body-parser').json();

const elasticClient = elastic.Client({
    host: 'localhost:9200',
});

let articles = require('./articles.json'); 

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
        index: 'articles',
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
        index: 'articles',
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
        index: 'articles',
    }
    if (req.query.article) query.q = `*$(req.query.article)`;
    elasticClient.search(query)
    .then(resp => {
        return res.status(200).json({
            articles: resp.hits.hits
        });
    })
    .catch(err => {
        return res.status(500).json({
            msg: 'Error',
            err
        });
    });
});