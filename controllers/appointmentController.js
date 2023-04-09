const mongoose = require('mongoose');
const doctorModel = require('../models/doctorModel');
const appointmentModel = require('../models/appointmentModel');
const moment = require('moment');

module.exports.appointment = async function (req, res) {
  try {
    let data = req.body;
    const doctorId = req.params.doctorId;
    let {
      timeDuration,
      weekAvailability,
      slotType,
      isAvailable,
      allDay,
      appointmentDate,
      slots,
      startTime,
      endTime,
      startDate,
      endDate,
    } = data;

    if (!mongoose.isValidObjectId(doctorId))
      return res
        .status(400)
        .send({ Status: false, message: 'Please enter valid doctorId ' });
    if (!timeDuration || timeDuration == '')
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide timeDuration ' });
    if (!slotType || slotType == '') {
      return res
        .status(400)
        .send({ Status: false, message: 'Please provide slotType' });
    }
    if (slotType) {
      if (!['week', 'date', 'all'].includes(slotType)) {
        return res
          .status(400)
          .send({
            Status: false,
            message: 'Slot Type must be week, date and all ',
          });
      }
    }

    if (isAvailable === true) {
      if (
        (allDay === true && slotType === 'all') ||
        (allDay === false && slotType === 'week') ||
        (allDay === false && slotType === 'date')
      ) {
        startTime = moment(req.body.startTime, 'HH:mm');
        endTime = moment(req.body.endTime, 'HH:mm');
        slots = [];
        while (startTime < endTime) {
          slots.push(new moment(startTime).format('HH:mm'));
          startTime.add(req.body.timeDuration, 'minutes').hours();
        }
        if ((startTime - endTime) / timeDuration !== 0) {
          console.log(slots.pop());
        }
      }

      if (allDay === false && slotType === 'all') {
        return res
          .status(400)
          .send({ Status: false, message: ' Please set all day true ' });
      }
      if (allDay === true && slotType === 'week') {
        return res
          .status(400)
          .send({ Status: false, message: ' Please set all day false ' });
      }
      if (allDay === true && slotType === 'date') {
        return res
          .status(400)
          .send({ Status: false, message: ' Please set all day false ' });
      }

      if (allDay === false && slotType === 'week') {
        weekAvailability = moment(req.body.weekAvailability, 'ddd').format(
          'ddd'
        );
      }
    } else {
      return res
        .status(400)
        .send({ status: false, message: 'please check availability' });
    }

    let obj = {
      doctorId,
      timeDuration,
      weekAvailability: weekAvailability,
      slotType,
      isAvailable,
      allDay,
      appointmentDate: appointmentDate,
      slots: slots,
      startDate,
      endDate,
    };

    let savedData = await appointmentModel.create(obj);
    return res.status(201).send({ status: true, message: savedData });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports.getWeekById = async function (req, res) {
  try {
    const doctorId = req.params.doctorId;

    if (!mongoose.isValidObjectId(doctorId))
      return res
        .status(400)
        .send({ Status: false, message: 'Please enter valid doctorId ' });

    let allappointment = await appointmentModel
      .findOne({
        doctorId: doctorId,
        isAvailable: true,
        slotType: 'week',
        allDay: false,
      })
      .lean();
    if (!allappointment) {
      return res.status(400).send({ status: false, message: 'slot not found' });
    }
    return res
      .status(200)
      .send({
        status: true,
        message: 'appointment list',
        data: allappointment,
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports.getAlldayById = async function (req, res) {
  try {
    const doctorId = req.params.doctorId;

    if (!mongoose.isValidObjectId(doctorId))
      return res
        .status(400)
        .send({ Status: false, message: 'Please enter valid doctorId ' });

    let allappointment = await appointmentModel
      .findOne({
        doctorId: doctorId,
        isAvailable: true,
        slotType: 'all',
        allDay: true,
      })
      .lean();
    if (!allappointment) {
      return res.status(400).send({ status: false, message: 'slot not found' });
    }
    return res
      .status(200)
      .send({
        status: true,
        message: 'appointment list',
        data: allappointment,
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports.getdateById = async function (req, res) {
  try {
    const doctorId = req.params.doctorId;

    if (!mongoose.isValidObjectId(doctorId))
      return res
        .status(400)
        .send({ Status: false, message: 'Please enter valid doctorId ' });

    let allappointment = await appointmentModel
      .find({
        doctorId: doctorId,
        isAvailable: true,
        slotType: 'date',
        allDay: false,
      })
      .lean();
    if (!allappointment) {
      return res.status(400).send({ status: false, message: 'slot not found' });
    }
    return res
      .status(200)
      .send({
        status: true,
        message: 'appointment list',
        data: allappointment,
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};
