const express = require('express');
const router = express.Router();
const doctorController = require("../controllers/doctorController")
const appointmentController = require("../controllers/appointmentController")
const tokenChecker = require("../middleware/auth")
const cors = require("cors");

router.use(express.json());
router.use(cors());
router.use(express.urlencoded({ extended: true }));



router.post("/registration" , doctorController.createProfile)

router.post("/login", doctorController.login)

router.post('/logout',  doctorController.logout);


router.get("/getDoctore", tokenChecker.tokenChecker ,doctorController.getDoctor)

router.get("/getDoctoreById/:doctorId", doctorController.getDoctorById)


router.post('/forgot-password',  doctorController.getForgotPassword)

router.post('/reset-password', doctorController.resetPassword)
 




router.post("/appointment/:doctorId", appointmentController.appointment)

router.get("/getWeekById/:doctorId", appointmentController.getWeekById)

router.get("/getAlldayById/:doctorId", appointmentController.getAlldayById)

router.get("/getdateById/:doctorId", appointmentController.getdateById)




module.exports = router; 