/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
const https = require("https");
const request = require("request");

module.exports = function(app, db) {
  app.route("/api/stock-prices").get(function(req, res) {
    // two stocks chosen
    if (Array.isArray(req.query.stock)) {
      let ipLogged1 = false;
      let ipLogged2 = false;

      // get first stock data
      request(
        `https://repeated-alpaca.glitch.me/v1/stock/${
          req.query.stock[0]
        }/quote`,
        { json: true },
        (err, response, body) => {
          if (err) {
            res.send("there was an error sending your request");
          } else {
            // if requested symbol exists...
            if (body != "Unknown symbol") {
              // save stock data
              let stock1 = {
                stock: body.symbol,
                price: body.latestPrice.toString()
              };
              // see if stock is in database alread
              db.collection("stocks")
                .find({ stock: stock1.stock })
                .toArray((err, data) => {
                  // if not, add it to the database
                  if (data.length == 0) {
                    db.collection("stocks").insertOne(
                      { stock: stock1.stock, ips: [], likes: 0 },
                      (err, data) => {
                        if (err) {
                          return err;
                        } else {
                          console.log("new db entry created");
                        }
                      }
                    );
                    // otherwise, see if the user's ip is logged
                  } else {
                    if (data[0].ips.includes(req.ip)) {
                      ipLogged1 = true;
                    }
                  }
                });
              // get second stock data
              request(
                `https://repeated-alpaca.glitch.me/v1/stock/${
                  req.query.stock[1]
                }/quote`,
                { json: true },
                (err2, response2, body2) => {
                  if (err) {
                    res.send("there was an error sending your request");
                  } else {
                    // if requested stock exists...
                    if (body2 != "Unknown symbol") {
                      // save stock data
                      let stock2 = {
                        stock: body2.symbol,
                        price: body2.latestPrice.toString()
                      };
                      // see if stock is in database
                      db.collection("stocks")
                        .find({ stock: stock2.stock })
                        .toArray((err, data) => {
                          // if not, add it to the database
                          if (data.length == 0) {
                            db.collection("stocks").insertOne(
                              { stock: stock2.stock, ips: [], likes: 0 },
                              (err, data) => {
                                if (err) {
                                  return err;
                                } else {
                                  console.log("new db entry created");
                                }
                              }
                            );
                          } else {
                            if (data[0].ips.includes(req.ip)) {
                              ipLogged2 = true;
                            }
                          }
                        });
                      // if user liked the stocks...
                      if (req.query.like) {
                        // and the ip isn't already logged in stock1
                        if (!ipLogged1) {
                          db.collection("stocks").updateOne(
                            { stock: stock1.stock },
                            { $push: { ips: req.ip }, $inc: { likes: 1 } },
                            (err, data) => {
                              if (err) return err;
                            }
                          );
                        }
                        // and the ip isn't already logged in stock2
                        if (!ipLogged2) {
                          db.collection("stocks").updateOne(
                            { stock: stock2.stock },
                            { $push: { ips: req.ip }, $inc: { likes: 1 } },
                            (err, data) => {
                              if (err) return err;
                            }
                          );
                        }
                      }
                      db.collection("stocks")
                        .find({
                          $or: [
                            { stock: stock1.stock },
                            { stock: stock2.stock }
                          ]
                        })
                        .toArray((err, data) => {
                          res.send({
                            stockData: [
                              {
                                stock: stock1.stock,
                                price: stock1.price,
                                rel_likes: data[0].likes - data[1].likes
                              },
                              {
                                stock: stock2.stock,
                                price: stock2.price,
                                rel_likes: data[1].likes - data[0].likes
                              }
                            ]
                          });
                        });

                      // otherwise, say stock doesn't exist
                    } else {
                      res.send("Unknown symbol");
                    }
                  }
                }
              );
              // otherwise, say stock doesn't exist
            } else {
              res.send("Unknown symbol");
            }
          }
        }
      );
      // one stock chosen
    } else {
      request(
        `https://repeated-alpaca.glitch.me/v1/stock/${req.query.stock}/quote`,
        { json: true },
        (err, response, body) => {
          if (err) {
            res.send("there was an error sending your request");
          } else {
            if (body != "Unknown symbol") {
              let stockData = {
                stock: body.symbol,
                price: body.latestPrice.toString(),
                likes: 0
              };
              // unliked...
              if (!req.query.like) {
                db.collection("stocks").findOne(
                  { stock: body.symbol },
                  (err, data) => {
                    if (err) {
                      res.send("something went wrong. please try again later.");
                    } else {
                      if (data) {
                        // unliked, existent
                        stockData.likes = data.likes;
                      } else {
                        // unliked, nonexistent
                        db.collection("stocks").insertOne({
                          stock: body.symbol,
                          ips: [],
                          likes: 0
                        });
                      }
                      res.send({ stockData: stockData });
                    }
                  }
                );
                // liked
              } else {
                db.collection("stocks").findOne(
                  { stock: body.symbol },
                  (err, data) => {
                    if (err) {
                      res.send("something went wrong. please try again later.");
                    } else {
                      if (data) {
                        // liked, existent, already liked once
                        if (data.ips.includes(req.ip)) {
                          stockData.likes = data.likes;
                        } else {
                          // liked, existent, new like
                          stockData.likes = data.likes + 1;
                          db.collection("stocks").updateOne(
                            { stock: body.symbol },
                            { $push: { ips: req.ip }, $inc: { likes: 1 } }
                          );
                        }
                      } else {
                        // liked, nonexistent
                        stockData.likes = 1;
                        db.collection("stocks").insertOne({
                          stock: body.symbol,
                          ips: [req.ip],
                          likes: 1
                        });
                      }
                      res.send({ stockData: stockData });
                    }
                  }
                );
              }
            } else {
              res.send("Unknown symbol");
            }
          }
        }
      );
    }
  });
};
