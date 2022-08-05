var db = require('../config/connection')
var collection = require('../config/collections')
var ObjectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
module.exports = {
    getAllUsers:()=>{
        return new Promise(async (resolve,reject)=>{
           let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
                resolve(users)
        })
      },
      getAllOrders:()=>{
        return new Promise(async (resolve,reject)=>{
          let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
          
            resolve(orders)

        })
      },
      changeOrderStatus:(body)=>{
        return new Promise((resolve,reject)=>{
          db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:ObjectId(body.orderId)},{
            $set:{
              status:body.status,
              placed:false
            },
            
          }).then(()=>{
            resolve()
          })
        })
      },
      changeStatusToPlaced:(orderId)=>{
        return new Promise((resolve,reject)=>{
          db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:ObjectId(orderId)},{
           $set:{
               status:'Placed',
               placed:true
           }
        }).then(()=>{
          resolve()
        })
      })
      },
      adminLogin:(body)=>{
        return new Promise(async (resolve,reject)=>{
          let loginStatus = false
          let response = {}
          let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Email: body.Email })
          if (admin) {
              bcrypt.compare(body.Password, admin.Password).then((status) => {
                  if (status) {
                      response.admin = admin
                      response.status = true
                      resolve(response)
                      console.log('Login Sucess')
                  } else {
                      console.log("login canceled")
                      resolve({ status: false })
                  }

              })
          } else {
              response.status = false
              console.log("login canceled")
              resolve({ status: false })
          }
        })
      }
}