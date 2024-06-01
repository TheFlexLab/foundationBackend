const mongoose = require("mongoose");
const DocumentDB = process.env.DATABASE;

const connectDB = async () => {
  if (DocumentDB === "DocumentDB") {
    try {
      const conn = await mongoose.connect(
        "mongodb://" +
          process.env.DOCS_DB_USER +
          ":" +
          process.env.DOCS_DB_PASSWORD +
          "@foundation.cluster-chkicsa8wkr6.us-east-2.docdb.amazonaws.com:27017/" + process.env.DOCS_DB_NAME +"?tls=true&tlsCAFile=global-bundle.pem" +
          "&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
      );
      console.log(
        `DocumentDB Connected! Database Name: ${conn.connection.db.databaseName} -  Host: ${conn.connection.host}`.cyan.underline.bold
      );
    } catch (err) {
      //console.log("Could not establish connection to DocDB! " + err);
    }
  } else {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        user: process.env.MONGO_USER,
        pass: process.env.MONGO_PASSWORD,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log(
        `MongoDB Connected! Database Name: ${conn.connection.db.databaseName} -  Host: ${conn.connection.host}`.cyan.underline.bold
      );
    } catch (err) {
      //console.log("Could not establish connection to MongoDB! " + err);
    }
  }
};

module.exports = connectDB;