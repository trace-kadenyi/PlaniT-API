const express = require("express");
const app = express();
// port
const PORT = process.env.PORT || 4000;

// path
const path = require("path");

// import routes
const root = require("./routes/root");

require("dotenv").config();
app.use(express.json());

// middleware to handle static files
app.use(express.static(path.join(__dirname, "public")));

// use routes
app.use("/", root);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
