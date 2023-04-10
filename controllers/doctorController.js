const mongoose = require('mongoose');
const doctorModel = require('../models/doctorModel');
const appointmentModel = require('../models/appointmentModel');
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const emailRegex =
  /^[a-z]{1}[a-z0-9._]{1,100}[@]{1}[a-z]{2,15}[.]{1}[a-z]{2,10}$/;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
//=============================REDIS===============================================================//
const redis = require('redis');
const util = require('util');
const { truncate } = require('fs');

const redisClient = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS,
  { no_ready_check: true }
);
redisClient.auth(process.env.REDIS_PASS, function (err) {
  if (err) throw err;
});

// Log successful connection
redisClient.on('connect', function () {
  console.log('Connected to Redis..');
});

const getAsync = util.promisify(redisClient.get).bind(redisClient);
const setAsync = util.promisify(redisClient.set).bind(redisClient);

//=============================cloudinary===============================================================//

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});

//=============================nodemailer===============================================================//

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

let isEmpty = function (value) {
  if (typeof value === 'undefined' || value === null) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  return false;
};

module.exports.createProfile = async (req, res) => {
  try {
    let data = req.body;
    let {
      fullName,
      email,
      phone,
      password,
      experience,
      consultationFee,
      specialization,
      address,
      education,
      gender,
    } = data;
    if (!fullName || fullName == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide fullName' });
    }
    if (!email || email == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide email' });
    }
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .send({ Status: false, message: 'Please enter valid email' });
    }
    let existingUser = await doctorModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send({
        Status: false,
        message: 'Email already exists. Please use a different email.',
      });
    }
    if (!password || password == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide password' });
    }
    if (!phone || phone == '') {
      return res
        .status(400)
        .send({ status: false, message: 'Please provide phone number' });
    }
    if (!req.files || !req.files.profileImage) {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide profileImage' });
    }
    let profileImage = req.files.profileImage;
    if (!experience || experience == '') {
      return res
        .status(400)
        .send({ status: false, message: 'Please provide experience' });
    }

    if (!consultationFee || consultationFee == '') {
      return res
        .status(400)
        .send({ status: false, message: 'Please provide consultation fee' });
    }

    if (!specialization || specialization == '') {
      return res
        .status(400)
        .send({ status: false, message: 'Please provide specialization' });
    }

    if (!address || address == '') {
      return res
        .status(400)
        .send({ status: false, message: 'Please provide address' });
    }

    if (!education || education == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide education' });
    }

    if (!gender || gender == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide gender' });
    }
    if (gender) {
      if (!['Male', 'Female', 'Other'].includes(gender)) {
        return res
          .status(400)
          .send({
            Status: false,
            message: 'Gender must be Male , Female and Other ',
          });
      }
    }

    if (profileImage.length == 0) {
      return res
        .status(400)
        .send({ status: false, message: 'upload profile image' });
    }
    const salt = await bcrypt.genSalt(saltRounds);
    const hashPassword = await bcrypt.hash(password, salt);
    const result = await cloudinary.uploader.upload(profileImage.tempFilePath, {
      resource_type: 'auto',
    });
    const product = {
      fullName,
      email,
      password: hashPassword,
      profileImage: result.url,
      phone,
      consultationFee,
      experience,
      specialization,
      address,
      education,
      gender,
    };
    const savedProduct = await doctorModel.create(product);

    res.status(201).send({ status: true, msg: savedProduct });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

/// Set up the local strategy
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async function (email, password, done) {
      try {
        const user = await doctorModel.findOne({ email });
        if (!user) {
          return done(null, false, { message: 'Incorrect email' });
        }
        const matchPassword = await bcrypt.compare(password, user.password);
        if (!matchPassword) {
          return done(null, false, { message: 'Incorrect password' });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize user
passport.serializeUser(function (user, done) {
  done(null, user._id);
});

// Deserialize user
passport.deserializeUser(async function (id, done) {
  try {
    const user = await doctorModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send({ status: false, message: 'Not authenticated' });
}

module.exports.login = async function (req, res, next) {
  try {
    passport.authenticate('local', async function (err, user, info) {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).send(info);
      }
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
        expiresIn: '24h',
      });

      req.session.userId = user._id;

      console.log(req.session);

      res.status(200).send({
        status: true,
        message: 'Login successful',
        token,
        user,
      });
    })(req, res, next);
  } catch (error) {
    next(error);
  }
};

module.exports.logout = function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send({ status: false, error: err.message });
    }

    res.status(200).send({ status: true, message: 'Logged out successfully' });
  });
};

module.exports.getDoctor = async function (req, res) {
  try {
    // Check if the data is available in Redis cache
    const cachedData = await getAsync('doctorData');
    if (cachedData) {
      console.log('Data retrieved from Redis cache');
      res.status(200).send(JSON.parse(cachedData));
      return;
    }
    // If data is not available in Redis cache, fetch it from MongoDB
    const doctorFound = await appointmentModel.find().populate('doctorId');
    if (doctorFound.length > 0) {
      console.log('Data retrieved from MongoDB');
      // Store the data in Redis cache for future use with an expiration time of 10 minutes
      await setAsync('doctorData', JSON.stringify(doctorFound), 'EX', 600);
      res.status(200).send(doctorFound);
    } else {
      res.status(404).send({ status: false, message: 'No such data found ' });
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
        return res
          .status(400)
          .send({ Status: false, message: 'Please enter valid doctorId' });
    }
    let doctorFound = await doctorModel.findOne({ _id: doctorId });

    res.status(200).send({ status: true, message: doctorFound });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports.getForgotPassword = async function (req, res) {
  const { email } = req.body;

  try {
    const user = await doctorModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(4).toString('hex').toUpperCase();
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    const mailOptions = {
      from: 'bhuvi844964@gmail.com',
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset for your account.</p><p>Your OTP is ${resetToken}. Please use this to reset your password. </p>`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).send({ message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(500).send({ message: 'Internal server error' });
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
      return res.status(400).send({ message: 'Invalid or expired token' });
    }

    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashPassword;
    user.resetToken = null;
    user.resetTokenExpiration = null;
    await user.save();

    res.status(200).send({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).send({ message: 'Internal server error' });
  }
};

module.exports.doctorUpdate = async function (req, res) {
  try {
    const data = req.body;
    const doctorId = req.params.doctorId;
    let profileImage;
    if (req.files && req.files.profileImage) {
      profileImage = req.files.profileImage;
    }
    if (!mongoose.isValidObjectId(doctorId)) {
      return res
        .status(400)
        .send({ status: false, message: 'Invalid doctorId format' });
    }

    const findDoctor = await doctorModel.findById(doctorId);
    if (!findDoctor) {
      return res
        .status(404)
        .send({ status: false, message: 'Doctor not found' });
    }

    if (Object.keys(data).length === 0 && !req.files.profileImage) {
      return res
        .status(400)
        .send({ status: false, message: 'No data provided for update' });
    }

    if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
      return res
        .status(400)
        .send({ status: false, message: 'Invalid gender value' });
    }

    let imageUrl = findDoctor.profileImage;
    if (profileImage) {
      const result = await cloudinary.uploader.upload(
        profileImage.tempFilePath,
        { resource_type: 'auto' }
      );
      imageUrl = result.url;
    }

    const hashPassword = data.password
      ? await bcrypt.hash(data.password, saltRounds)
      : findDoctor.password;

    const updatedDoctor = await doctorModel.findByIdAndUpdate(
      doctorId,
      {
        $set: {
          fullName: data.fullName || findDoctor.fullName,
          email: data.email || findDoctor.email,
          phone: data.phone || findDoctor.phone,
          password: hashPassword,
          consultationFee: data.consultationFee || findDoctor.consultationFee,
          experience: data.experience || findDoctor.experience,
          specialization: data.specialization || findDoctor.specialization,
          address: data.address || findDoctor.address,
          education: data.education || findDoctor.education,
          gender: data.gender || findDoctor.gender,
          profileImage: imageUrl,
        },
      },
      { new: true, upsert: true }
    );

    return res
      .status(200)
      .send({
        status: true,
        message: 'Doctor details updated successfully',
        data: updatedDoctor,
      });
  } catch (error) {
    console.log(error);
    res.status(500).send({ status: false, error: error.message });
  }
};
