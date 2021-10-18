# DAAR Project 2 - Elastic search
### Do Duc Huy, Patryk Fussek
### Fall semester 2021
---
### Setup

**Requirements**:
- nodejs
- express
- elasticsearch

**Install app**:
1. `git clone <this project>`
2. `yarn`

**Run app**:
`npm run dev`

**Run ES (docker)**:

0. Install docker and docker-compose
1. `cd docker`
2. `docker-compose up -d`

### API
GET - get title
> http://localhost:3000/api/articles/<title>

POST
> http://localhost:3000/api/articles

GET - search article
> http://localhost:3000/api/articles?search=<keyword>
