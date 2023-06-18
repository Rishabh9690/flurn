const express = require("express");
const router = express.Router();

const {
    getAllSeats,
    insertData,
    insertPrice,
    getSeatsById,
    createUser,
    createBooking,
    getBooking,
}= require("../Controllers/controller");


router.post("/insertSeatList", insertData )
router.post("/insertSeatPrice",  insertPrice)
router.get("/getAllSeats",  getAllSeats)
router.get("/getSeatInfo/:id",  getSeatsById)
router.post("/createUser",  createUser)
router.post("/createBooking",  createBooking)
router.get("/getBookingInfo/:data?",  getBooking)
module.exports= router;