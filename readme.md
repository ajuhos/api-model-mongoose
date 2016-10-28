# api-model-mongoose

Data Model factory for api-core based APIs using MongoDB 
as a data source.

## Installation

```bash
npm install api-model-mongoose
```

## Usage
```javascript
const mongoose = require('mongoose'),
      MongooseModelFactory = require('api-model-mongoose').MongooseModelFactory;

const UserEdge =
    MongooseModelFactory.createModel("user", "users", {
        id: String,
        firstName: String,
        lastName: String,
        email: String,
        phone: String
    });
    
const API = new Api('1.0').edge(new UserEdge());
```