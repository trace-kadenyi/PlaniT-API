const express = require('express');
const app = express();
const PORT = process.env.PORT || 4000;

const path = require("path");

require('dotenv').config();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
