const mongoose = require("mongoose")
const doctorModel = require("../models/doctorModel");
const appointmentModel = require("../models/appointmentModel");
const cloudinary = require("cloudinary").v2
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const emailRegex = /^[a-z]{1}[a-z0-9._]{1,100}[@]{1}[a-z]{2,15}[.]{1}[a-z]{2,10}$/;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;




cloudinary.config({ 
  cloud_name:  process.env.CLOUD_NAME,
  api_key:  process.env.CLOUD_API_KEY,
  api_secret:  process.env.CLOUD_SECRET_KEY,
});


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
});



module.exports.createProfile = async (req, res) => {
  let profileImage = req.files.profileImage;

  try {
    let data = req.body;
    let { fullName, email, phone, password, experience, consultationFee, specialization, address, education, gender } = data;
    if (!fullName || fullName == "") { 
      return res.status(400).send({ Status: false, message: "Please provide fullName" })
  }
    if (!email || email == "") {
      return res.status(400).send({ Status: false, message: "Please provide email" })
  }
  if (!emailRegex.test(email)) {
    return res.status(400).send({ Status: false, message: "Please enter valid email" })
  }
    let existingUser = await doctorModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        Status: false,
        message: "Email already exists. Please use a different email."
      }); 
    }
    if (!password || password == "") {
      return res.status(400).send({ Status: false, message: "Please provide password" })
  }
  if (!phone || phone == "") {
    return res.status(400).send({ status: false, message: "Please provide phone number" });
  }
  if (!profileImage || profileImage == "") {
    return res.status(400).send({ Status: false, message: "Please provide profileImage" })
}
if (!experience || experience == "") {
  return res.status(400).send({ status: false, message: "Please provide experience" });
}

if (!consultationFee || consultationFee == "") {
  return res.status(400).send({ status: false, message: "Please provide consultation fee" });
}

if (!specialization || specialization == "") {
  return res.status(400).send({ status: false, message: "Please provide specialization" });
}

if (!address || address == "") {
  return res.status(400).send({ status: false, message: "Please provide address" });
}

if (!education || education == "") {
  return res.status(400).send({ Status: false, message: "Please provide education" })
}

if (!gender || gender == "") {
  return res.status(400).send({ Status: false, message: "Please provide gender" })
}
if(gender){
if(!( ["Male", "Female", "Other"].includes(gender))) {
  return res.status(400).send({ Status: false, message: "Gender must be Male , Female and Other " })
}
}


if (profileImage.length == 0){
  return res.status(400).send({ status: false, message: "upload profile image" });
}
const salt = await bcrypt.genSalt(saltRounds);
const hashPassword = await bcrypt.hash(password, salt);
    const result = await cloudinary.uploader.upload(profileImage.tempFilePath, { resource_type: "auto" });
    const product = {
      fullName,
      email,
      password:hashPassword,
      profileImage: result.url,
      phone,
      consultationFee,
      experience,
      specialization,
      address,
      education, 
      gender
    };
    const savedProduct = await doctorModel.create(product); 

     res.status(201).send({ status : true, msg: savedProduct })
  } catch (error) {
    res.status(500).send({ status: false, error: error.message })
  }
};
 
 






module.exports.getDoctor = async function (req, res) {
  try {
    let doctorFound = await appointmentModel.find().populate("doctorId")
    if (doctorFound.length > 0) {
      res.status(200).send( doctorFound );
    } else {
        res.status(404).send({ status: false, message: "No such data found " });
    }
  } catch (error) {
    res.status(500).send({ status: false, error: error.message }); 
  }
}; 

 

module.exports.getDoctorById = async function (req, res) {
  try {

    let doctorId = req.params.doctorId;

    if (doctorId) {
      if (!mongoose.isValidObjectId(doctorId))
          return res.status(400).send({ Status: false, message: "Please enter valid doctorId" })
  }
    let doctorFound = await doctorModel.findOne({ _id: doctorId })
        let allappointment = await appointmentModel.find({ doctorId: doctorId, isAvailable: true })
 
    res.status(200).send({ status: true, message: doctorFound  , allappointment  });
 
  } catch (error) {
    res.status(500).send({ status: false, error: error.message }); 
  }  
}; 



module.exports.getForgotPassword = async function (req, res) {
  const { email } = req.body;

  try {
    const user = await doctorModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const resetToken = crypto.randomBytes(4).toString("hex").toUpperCase();
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      from: "bhuvi844964@gmail.com",
      to: email,
      subject: "Password Reset Request",
      html: `<p>You requested a password reset for your account.</p><p>Your OTP is ${resetToken}. Please use this to reset your password. </p>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).send({ message: "Password reset link sent to your email" });
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });               
  }
};




module.exports.resetPassword = async function (req, res) {
  const { token, newPassword } = req.body;

  try {
    const user = await doctorModel.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });
    console.log(user);
    if (!user) {
      return res.status(400).send({ message: "Invalid or expired token" });
    }

    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashPassword;
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();

    res.status(200).send({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).send({ message: "Internal server error" });
  }
}; 


