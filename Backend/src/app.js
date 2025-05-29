const express = require('express');
const projectRoutes = require("./routes/project.routes")
const cors = require('cors');
const morgan = require('morgan');
const app = express();


app.use(cors());
app.use(morgan('dev'));
app.use(express.json({
    limit: "10mb"
}))
app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}))


app.use('/v1/api/projects', projectRoutes)

module.exports = app;