const Ledgers = require("../models/Ledgers");
const Users = require("../models/UserModel");
const AWS = require("aws-sdk");

const create = async (req, res) => {
  try {
    const ledger = await new Ledgers({ ...req.body });
    const savedLedger = await ledger.save();
    if (!savedLedger) throw new Error("Ledger Not Created Successfully!");
    res.status(201).json({ data: savedLedger });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while create Ledger: ${error.message}`,
    });
  }
};

const getById = async (req, res) => {
  try {
    const { page, limit, txAuth } = req.query;
    const uuid = req.cookies.uuid || req.body.uuid;
    // filter Object
    const filterObj = {};
    if (txAuth) {
      filterObj.txAuth = txAuth;
      filterObj.$or = [
        { txFrom: { $regex: "DAO Treasury", $options: "i" } }, // Case-insensitive match for txFrom
        { txTo: { $regex: "DAO Treasury", $options: "i" } }    // Case-insensitive match for txTo
      ]
    } else {
      filterObj.uuid = uuid
    }
    const skip = (page - 1) * limit;

    const ledger = await Ledgers.find(filterObj)
      // .sort({ _id: 1 }) // Adjust the sorting based on your needs
      .sort(req.query.sort === "newest" ? { _id: -1 } : { _id: 1 }) // Adjust the sorting based on your needs
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Ledgers.countDocuments(filterObj);
    const pageCount = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: ledger,
      pageCount,
      totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while getById Ledger: ${error.message}`,
    });
  }
};

const getAll = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const ledger = await Ledgers.find({})
      .sort(req.query.sort === "newest" ? { _id: 1 } : { _id: -1 }) // Adjust the sorting based on your needs
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Ledgers.countDocuments();
    const pageCount = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: ledger,
      pageCount,
      totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while getAll Ledger: ${error.message}`,
    });
  }
};

const search = async (req, res) => {
  try {
    const { page, limit, sort, term, type, uuid } = req.body.params;
    const skip = (page - 1) * limit;
    const searchTerm = term || "";

    const ledger = await Ledgers.find({
      type,
      uuid,
      $or: [
        { txUserAction: { $regex: searchTerm, $options: "i" } },
        { txID: { $regex: searchTerm, $options: "i" } },
        { txData: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .sort(sort === "newest" ? { _id: 1 } : { _id: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await Ledgers.countDocuments({
      type,
      uuid,
      $or: [
        { txUserAction: { $regex: searchTerm, $options: "i" } },
        { txID: { $regex: searchTerm, $options: "i" } },
        { txData: { $regex: searchTerm, $options: "i" } },
      ],
    });
    const pageCount = Math.ceil(totalCount / limit);
    //console.log(pageCount);
    //console.log(totalCount);

    res.status(200).json({
      data: ledger,
      pageCount,
      totalCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: ` An error occurred while search Ledger: ${error.message}`,
    });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const ledger = Ledgers.findByIdAndDelete(id);
    res.status(200).json({ data: ledger });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: `An error occurred while remove Ledger: ${error.message}`,
    });
  }
};

const getLstActAndEmailForAllUsers = async () => {
  try {
    //console.log("getLstActAndEmailForAllUsers")
    
    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Aggregate to find the latest activity time for each UUID where last activity is more than 7 days ago
    const filteredUUIDs = await Ledgers.aggregate([
      {
        $group: {
          _id: "$uuid",
          lastActiveTime: { $max: "$updatedAt" }
        }
      },
      {
        $match: {
          lastActiveTime: { $lte: sevenDaysAgo }
        }
      }
    ]);

    // Fetch user emails from the users table for the filtered UUIDs
    const usersWithEmails = await Users.find({ uuid: { $in: filteredUUIDs.map(item => item._id) } }, { uuid: 1, email: 1 });

    // Create a map to store email for each UUID
    const uuidToEmailMap = new Map(usersWithEmails.map(user => [user.uuid, user.email]));

    // Filter out objects where email is not found or contains '@guest.com'
    const finalFilteredUUIDs = filteredUUIDs.filter(item => {
      const email = uuidToEmailMap.get(item._id);
      return email && !email.includes('@guest.com');
    }).map(item => ({
      uuid: item._id,
      lastActiveTime: item.lastActiveTime,
      email: uuidToEmailMap.get(item._id)
    }));

    if (finalFilteredUUIDs.length > 0) {
      // SES configuration
      const SES_CONFIG = {
        region: process.env.AWS_SES_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      };

      // Create SES service object
      const sesClient = new AWS.SES(SES_CONFIG);

      // Iterate over each email and send an email
      await Promise.all(finalFilteredUUIDs.map(async (item) => {
        const params = {
          Source: process.env.AWS_SES_SENDER,
          Destination: {
            // ToAddresses: [item.email],
            ToAddresses: ['sameer192.official@gmail.com'],
          },
          Message: {
            Body: {
              Html: {
                Charset: "UTF-8",
                Data: `You are inactive from the last seven days, Click <a href = "https://on.foundation/dashboard/">here</a> to visit your app.`,
              },
              Text: {
                Charset: "UTF-8",
                Data: "Inactivity",
              },
            },
            Subject: {
              Charset: "UTF-8",
              Data: "Inactivity",
            },
          },
        };
        try {
          await sesClient.sendEmail(params).promise();
          //console.log(`Email has been sent to ${item.email}`);
        } catch (error) {
          console.error(`Error sending email to ${item.email}:`, error);
        }
      }));

      // Send the response after all emails have been sent
      // res.json({ lastActiveTimes: finalFilteredUUIDs });
      //console.log({ lastActiveTimes: finalFilteredUUIDs });
    } else {
      // If no records are found, send an appropriate message
      // res.status(404).json({ message: 'No records found where 7 days have passed since last activity' });
      //console.log({ message: 'No records found where 7 days have passed since last activity' });
    }

    //console.log('Completed==============')
  } catch (error) {
    // If an error occurs during the database query, send an error response
    console.error('Error occurred while fetching last active times for all users:', error);
  }
};


module.exports = {
  create,
  getById,
  getAll,
  search,
  remove,
  getLstActAndEmailForAllUsers
};
