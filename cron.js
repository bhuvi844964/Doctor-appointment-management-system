const nodemailer = require('nodemailer');
const cron = require('node-cron');
const doctorModel = require('./models/doctorModel');

const SendMailToAllUsers = async (emailObj) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
  });

  const mailOptions = {
    from: 'bhuvi844964@gmail.com',
    to: emailObj,
    subject: 'Doctor manegment offers',
    html: `<p>This app will be 20% off on Sunday for all users </p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Mail has been sent :-', info.response);
    }
  });
};

const sendMailAllUser = () => {
  try {
    cron.schedule('0 0 * * 0', async () => {
      const userData = await doctorModel.find({});
      if (userData.length > 0) {
        const emails = [];

        userData.map((key) => {
          emails.push(key.email);
        });
        SendMailToAllUsers(emails);
      }
    });
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = { sendMailAllUser };
