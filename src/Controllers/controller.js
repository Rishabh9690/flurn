const express = require("express");
const twilio= require("twilio");
const nodemailer = require("nodemailer");
const csv= require("csv-parser");
const fs = require('fs');
const {connection}= require("../database/connection");
const { toASCII } = require("punycode");
const { constrainedMemory } = require("process");
const seatPrice=[];

const queryExecutor = (query) => {
    return new Promise((resolve, reject) => {
      connection.query(query, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  };

const readseatFile=()=>{
    fs.createReadStream('seatPricing.csv')
    .pipe(csv())
    .on('data', (data)=>seatPrice.push(data))
    .on("end", ()=>{
        console.log(seatPrice.length);
        console.log(seatPrice)
    })
}
const readseatList=()=>{
    const seatList=[];
    fs.createReadStream('./src/Controllers/seatList.csv')
    .pipe(csv())
    .on('data', (data)=>seatList.push(data))
    .on("end", ()=>{
        console.log(seatList.length);
        console.log(seatList)
    })
}

//-------------------Inserting Data---------------------------

const insertData = async (req, res) => {
    try {
      const seatList = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream('./src/Controllers/seatList.csv')
          .pipe(csv())
          .on('data', (data) => seatList.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
  
      console.log(seatList[0]);
      let result= seatList.reduce((items, item)=>{
        let fixed={};
        for(const [key, value] of Object.entries(item))
        {
            let k= key.split("\t");
            let v= value.split("\t");
            // console.log("K=====", k);
            // console.log("V====", v)
            fixed[k[0]]= v[0];
            fixed[k[1]]= v[1];
            fixed[k[2]]= v[2];
        }
        items.push(fixed);
        return items;
      }, []);

      console.log(result.length);
      console.log("result", result[0]);
  
      if (result.length > 0) {
        console.log('Outside', seatList.length);
  
        const promises = result.map(async (ele) => {
            console.log("Elements", ele)
          const sql = `INSERT INTO seatlist (seat_identifier, seat_class, booked, createDate) VALUES ('${ele.seat_identifier}', '${ele.seat_class}', false, now()+1)`;
          await queryExecutor(sql);
        });
  
        await Promise.all(promises);
      }
  
      console.log('Inserted');
      return res.status(201).send({
        message: 'Inserted',
      });
    } catch (err) {
      console.log('Error is here.------ORDER_CONTROLLER', err);
      return res.status(500).send({
        message: 'Error',
        Error: err,
      });
    }
  };

  const insertPrice = async (req, res) => {
    try {
      const seatPrice = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream('./src/Controllers/seatPricing.csv')
          .pipe(csv())
          .on('data', (data) => seatPrice.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
  
      console.log("Here is the seatPrice====", seatPrice[0]);
      let result= seatPrice.reduce((items, item)=>{
        let fixed={};
        for(const [key, value] of Object.entries(item))
        {
            let k= key.split("\t");
            let v= value.split("\t");
            // console.log("K=====", k);
            // console.log("V====", v)
            fixed[k[0]]= v[0];
            fixed[k[1]]= v[1];
            fixed[k[2]]= v[2];
        }
        items.push(fixed);
        return items;
      }, []);

      console.log(result.length);
      console.log("result", result[0]);
  
      if (result.length > 0) {
        console.log('Outside', result.length);
  
        const promises = result.map(async (ele) => {
            console.log("Elements", ele);
            ele.min_price= ele.min_price== ""? '0': ele.min_price;
            ele.max_price= ele.max_price== ""? '0': ele.max_price;
          const sql = `INSERT INTO seatprice (seat_class, min_price, normal_price, max_price, createDate) VALUES ('${ele.seat_class}', '${ele.min_price}', '${ele.normal_price}', '${ele.max_price}', now()+1)`;
          await queryExecutor(sql);
        });
  
        await Promise.all(promises);
      }
  
      console.log('Inserted');
      return res.status(201).send({
        message: 'Inserted',
      });
    } catch (err) {
      console.log('Error is here.------ORDER_CONTROLLER', err);
      return res.status(500).send({
        message: 'Error',
        Error: err,
      });
    }
  };

  const isEmailValid = (value) => {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,3}$/.test(value);
  };

  const isphoneNumbervalid = (value) => {
    return /^[6-9]{1}[0-9]{9}$/.test(value);
  };

  //-----------------------Logics--------------------------

const getAllSeats= async (req, res)=>{
    try{
        const sql=`SELECT * FROM seatlist ORDER BY seat_class`;
        const seatList= await queryExecutor(sql);
        if(seatList.length>0)
        {
            seatList.forEach(element => {
                if(element.booked==0)
                {
                    element.booked='open';
                }else{
                    element.booked='booked';
                }
            });
            console.log("Here is the first seat", seatList[0]);
            return res.status(200).send({
                message: "All seats", 
                seat: seatList
            })
        }

    }
    catch (err) {
        console.log("Error is here.------ORDER_CONTROLLER", err);
        return res.status(500).send({
          message: "Error",
          Error: err,
        });
      }
}

const getSeatsById= async (req, res)=>{
    try
    {
        const id= req.params.id;
        console.log("Id", id)
        const sql1= `SELECT seat_identifier, seat_class, booked FROM seatlist WHERE seat_identifier= '${id}'`;
        const seatInfo= await queryExecutor(sql1);
        console.log("Seat Info==", seatInfo);
        if(seatInfo.length==0)
        {
            console.log("Wrong id");
            return res.status(404).send({
                message:"Wrong Id"
            })
        }
        
        const sql2=`SELECT * FROM seatlist WHERE seat_class= '${seatInfo[0].seat_class}'`;
        const allSeats= await queryExecutor(sql2);
    
        let booked=0, unbooked=0, totalSeats=0;
        allSeats.forEach(element => {
            if(element.booked==0)
            {
                unbooked+=1;
            }
            else
            {
                booked+=1;
            }
        });
        totalSeats= booked+unbooked;
    
        console.log("Here is the count", booked, unbooked);

        const sql3=`SELECT * FROM seatprice WHERE seat_class= '${seatInfo[0].seat_class}'`;
        const seatPrices= await queryExecutor(sql3);
        console.log("Here is the prices of the class", seatPrices)

        if(booked==0)
        {
            if(seatPrices[0].min_price!='0')
            {
                seatInfo[0].price= seatPrices[0].min_price;
            }
            else
            {
                seatInfo[0].price= seatPrices[0].normal_price;
            }
            if(seatInfo[0].booked==0)
            {
                seatInfo[0].booked='open';
            }
            else
            {
                seatInfo[0].booked='booked';
            }

            console.log("Here is the info of the seat=====>", seatInfo);
            return res.status(200).send({
                message: "Info", 
                seat: seatInfo
            })
        }
        else if(booked >= (Math.ceil((totalSeats*3)/5)))  //60% or greater
        {
            if(seatPrices[0].max_price!='0')
            {
                seatInfo[0].price= seatPrices[0].max_price;
            }
            else
            {
                seatInfo[0].price= seatPrices[0].normal_price;
            }
            if(seatInfo[0].booked==0)
            {
                seatInfo[0].booked='open';
            }
            else
            {
                seatInfo[0].booked='booked';
            }
        }
        else if(booked < (Math.ceil((totalSeats*3)/5)) && booked >= (Math.ceil((totalSeats*2)/5)))  //BetWeen 40%-60%
        {
            seatInfo[0].price= seatPrices[0].normal_price;
            if(seatInfo[0].booked==0)
            {
                seatInfo[0].booked='open';
            }
            else
            {
                seatInfo[0].booked='booked';
            }
        }
        else if( booked < (Math.ceil((totalSeats*2)/5)))  //Less than 40%
        {
            if(seatPrices[0].min_price!='0')
            {
                seatInfo[0].price= seatPrices[0].min_price;
            }
            else
            {
                seatInfo[0].price= seatPrices[0].normal_price;
            }
            if(seatInfo[0].booked==0)
            {
                seatInfo[0].booked='open';
            }
            else
            {
                seatInfo[0].booked='booked';
            }
        }

        console.log("Here is the seatInfo for booked=========>", seatInfo);
        return res.status(200).send({
            message: "Info", 
            seat: seatInfo
        })
    }
    catch (err) {
        console.log("Error is here.------ORDER_CONTROLLER", err);
        return res.status(500).send({
          message: "Error",
          Error: err,
        });
      }

}

//Self added, to add the users
const createUser= async (req, res)=>{
    try
    {
        const data= req.body;
        if(!data)
        {
          console.log("Please enter the info of User.");
          return res.status(400).send({
            message:"Please enter the info of User."
          })
        }

        const {Name, Email, phoneNumber}=data;
        if(Name.length<=1)
        {
          console.log("Please enter the Name of User.");
          return res.status(400).send({
            message:"Please enter the Name of User."
          })
        }
        if(Email.length<=1)
        {
          console.log("Please enter the Email of User.");
          return res.status(400).send({
            message:"Please enter the Email of User."
          })
        }
        if (!isEmailValid(Email)) 
        {
          console.log("Email is not valid.");
          return res.status(400).send({
            message: "Please enter a valid email address of User.",
          });
        }

        if(phoneNumber.length<=1)
        {
          console.log("Please enter the phoneNumber of User.");
          return res.status(400).send({
            message:"Please enter the phoneNumber of User."
          })
        }
        if (!isphoneNumbervalid(phoneNumber)) 
        {
          console.log(
            "Please enter a valid phone Number.");
          return res.status(400).send({
            message: "Please enter a valid phoneNumber of User.",
          });
        }

        const sqlEmail= `SELECT id FROM user WHERE email= '${Email}'`;
        const searchEmail= await queryExecutor(sqlEmail);
        if(searchEmail.length>0)
        {
          console.log("The Emailid in use.");
          return res.status(400).send({
            message:"The Emailid in use."
          })
        }
        const sqlPhoneNumber= `SELECT id FROM user WHERE phoneNumber= '${phoneNumber}'`;
        const searchphoneNumber= await queryExecutor(sqlPhoneNumber);
        if(searchphoneNumber.length>0)
        {
          console.log("The phoneNumber in use.");
          return res.status(400).send({
            message:"The phoneNumber in use."
          })
        }

        const sql= `INSERT INTO user (name, phoneNumber, email, createDate) VALUES('${Name}', '${phoneNumber}', '${Email}', now()+1)`;
        await queryExecutor(sql);
        console.log("Here is the user", data);
        return res.status(201).send({
          message:"user is created.",
          UserInfo: data
        });
    }
    catch(err){
      console.log("Error is here", err);
      return res.status(500).send({
        message:"Error",
        Error: err
      })
    }
}

const createBooking= async(req, res)=>{
  try
  {
    const data= req.body;
    let totalAmount=0;
    if(!data)
    {
        console.log("Please enter the required info");
        return res.status(400).send({
            message:"Please enter the required info"
        })
    }
    const {name, email, seat_ids}= data;
    console.log("data", name, email, seat_ids);

    const promises= seat_ids.map(async(element)=>{
      const sql=`SELECT seat_identifier, seat_class, booked FROM seatlist WHERE seat_identifier= '${element}'`;
      // await queryExecutor(sql);
      const seat= await queryExecutor(sql);
      return seat[0];
    })

    const info= await Promise.all(promises);
    console.log("Here is the data from info", info);

    const alreadyBookedSeats= info.filter((element)=> element.booked==1
      // if(element.booked==1)
      // {
      //   return element;
      // }
    )
    if(alreadyBookedSeats.length>0)
    {
      console.log("Here is the data2", alreadyBookedSeats);
      return res.status(400).send({
        message: "These seat are already booked.",
        seat_identifier: alreadyBookedSeats
      })
    }

    const sqlEmail= `SELECT id FROM user WHERE email= '${email}'`;
    const isEmailPresent= await queryExecutor(sqlEmail);
    if(isEmailPresent.length==0)
    {
      console.log("Email not present.");
      return res.status(404).send({
        message: "Email not present",
        email:email
      })
    }
    /////////////////////////////////////////////////

    for(const s_class of info)
    {
      const sql2=`SELECT * FROM seatlist WHERE seat_class= '${s_class.seat_class}'`;
          const allSeats= await queryExecutor(sql2);
          let booked=0, unbooked=0, totalSeats=0;
          allSeats.forEach(element => {
              if(element.booked==0)
              {
                  unbooked+=1;
              }
              else
              {
                  booked+=1;
              }
          });
          totalSeats= booked+unbooked;
          console.log("Here is the count", booked, unbooked);
          const sql3=`SELECT * FROM seatprice WHERE seat_class= '${s_class.seat_class}'`;
          const seatPrices= await queryExecutor(sql3);
          console.log("Here is the prices of the class", seatPrices)

          if(booked==0)
          {
              if(seatPrices[0].min_price!='0')
              {
                s_class.price= seatPrices[0].min_price;
              }
              else
              {
                s_class.price= seatPrices[0].normal_price;
              }
              if(s_class.booked==0)
              {
                s_class.booked='open';
              }
              else
              {
                s_class.booked='booked';
              }
      
              console.log("Here is the info of the seat=====>", s_class);
              // return res.status(200).send({
              //     message: "Info", 
              //     seat: seatInfo
              // })
          }
          else if(booked >= (Math.ceil((totalSeats*3)/5)))  //60% or greater
          {
              if(seatPrices[0].max_price!='0')
              {
                s_class.price= seatPrices[0].max_price;
              }
              else
              {
                s_class.price= seatPrices[0].normal_price;
              }
              if(s_class.booked==0)
              {
                s_class.booked='open';
              }
              else
              {
                s_class.booked='booked';
              }
          }
          else if(booked < (Math.ceil((totalSeats*3)/5)) && booked >= (Math.ceil((totalSeats*2)/5)))  //BetWeen 40%-60%
          {
            s_class.price= seatPrices[0].normal_price;
              if(s_class.booked==0)
              {
                s_class.booked='open';
              }
              else
              {
                s_class.booked='booked';
              }
          }
          else if( booked < (Math.ceil((totalSeats*2)/5)))  //Less than 40%
          {
              if(s_class.min_price!='0')
              {
                s_class.price= seatPrices[0].min_price;
              }
              else
              {
                s_class.price= seatPrices[0].normal_price;
              }
              if(s_class.booked==0)
              {
                  s_class.booked='open';
              }
              else
              {
                s_class.booked='booked';
              }
          }
    }
    console.log("Here is the all seat info=====>", info);

    const date= String(Date.now())
    // console.log("Date", typeof(date));
    const sqlLast= `SELECT id FROM bookinginfo ORDER BY id DESC LIMIT 1`;
    let lastId= await queryExecutor(sqlLast);
    lastId= lastId[0];
    console.log("LaastId1===>", lastId)
    if(lastId==null || lastId==undefined)
    {
      lastId=1;
    }
    else 
    {
      lastId= lastId.id;
      lastId+=1;
    }
    console.log("LaastId2===>", lastId);
    
    const newBookingId=date+String(lastId); //Here is the booking Id
    console.log("newBookingId===>", newBookingId, typeof(newBookingId));

    for(const element of info)
    {
      console.log("Here is the information og=f Booking======>", isEmailPresent[0].id, element.seat_identifier, element.price, name, newBookingId);
      const sql=`INSERT INTO bookinginfo (userId, seat_identifier, seat_price, orderDate, name, orderId) VALUES (${isEmailPresent[0].id}, '${element.seat_identifier}', '${element.price}', now()+1, '${name}', '${newBookingId}')`;
      await queryExecutor(sql);

      
      let rate= element.price.split("$");
      totalAmount+=Number(rate[1]);
    }
    
    for(const element of info)
    {
      const sqlUpdate=`UPDATE seatlist SET booked= true WHERE seat_identifier= '${element.seat_identifier}'`;
      await queryExecutor(sqlUpdate);
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      auth: {
        user: "hrms@dollarbirdinc.com",
        pass: "HRMS@db2023",
      },
    });
    const options = {
      from: "rishabhtest00@gmail.com",
      to: `"${email}"`,
      subject: "Booking Confirmation",
      text: `Your booking has been done successfully. Here are the details- totalAmount:${totalAmount.toFixed(2)},
        BookingId: ${newBookingId}`,
    };
    transporter.sendMail(options, (error, info) => {
      if (error) {
        console.log("Error is here..", error);
        return;
      }
      console.log("Sent the email..", info.response);
    });

    console.log("Booked.", totalAmount.toFixed(2));
    return res.status(201).send({
      message:"Booked",
      totalAmount: totalAmount.toFixed(2),
      BookingId: newBookingId
    })

  }
  catch(err){
    console.log("HEre is the error", err);
    return res.status(500).send({
      message:"Error",
      Error: err
    })
  } 

}

const getBooking= async (req, res)=>{
  const data= req.query;
  console.log("Data", data);
  if(!data || Object.keys(data).length==0)
  {
    console.log("Please provide the useridentifier");
    return res.status(400).send({
      message:"Please provide the useridentifier"
    })
  }
  const sqlUser=`SELECT id FROM user WHERE email='${data.userIdentifier}' OR phoneNumber= '${data.userIdentifier}'`;
  const user= await queryExecutor(sqlUser);
  if(user.length==0)
  {
    console.log("User not found");
    return res.status(404).send({
      message:"User not found"
    })
  }

  console.log("User", user)
  
  const sql=`SELECT userId, seat_identifier, seat_price, orderDate, name, orderId FROM bookinginfo WHERE userId=${user[0].id}`;
  const allBookings= await queryExecutor(sql);

  console.log("Here are the all bookings of the user", allBookings, allBookings.length);
  return res.status(200).send({
    message:"HEre are the all booking done by this user.",
    Bookings: allBookings
  })

}
module.exports= {getAllSeats, insertData, insertPrice, getSeatsById, createUser, createBooking, getBooking};