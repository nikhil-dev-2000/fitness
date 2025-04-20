const express = require('express');
const app = express();
const port = 4200;
const cors = require('cors');
const mysql = require('mysql2');
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
require('dotenv').config();

app.use(cors());
app.use(express.json());

// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

const config = {
  user: 'avnadmin',
  password: process.env.password,
  host: 'fitness-first-fitness-first.g.aivencloud.com',
  port: 13434,
  database: 'fitness_first_db',
  ssl: {
    rejectUnauthorized: true,
    ca: `-----BEGIN CERTIFICATE-----
MIIETTCCArWgAwIBAgIUKiMUWysHNQaf+2u7YQaBWGP4raIwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1ZjE0NDk1ZmEtM2Y3NS00MGM5LTg3MzItYmY4OWZkYWM2
NmJiIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwNDIwMDIyOTAwWhcNMzUwNDE4MDIy
OTAwWjBAMT4wPAYDVQQDDDVmMTQ0OTVmYS0zZjc1LTQwYzktODczMi1iZjg5ZmRh
YzY2YmIgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBALZ9pkNp/f1YzXTfbH3NnGCWKsiJQGtjUCOeiU1HqgGsxWAckOqZsYzw
dTCcMP8IK2/6BCXIPhN7E7TBMXCMiCKLs6tbOJyX0IQeWyQqNUObEItLzuNECm+m
19jXI+Nt/iwuNnrzAfowltbD3GOMyE5GtBtQpPDcJUCOEtD2hf9PCjh1ZAuDTNJ8
0LQTQfzfRaNCrKH4GfE2riXH7mt7ybohuFmCNO3sb/3R+KrgcHSvjL76RWG1YnC7
GaTVhczIKJrRRNqk2vxGiKz+shrW/NxCgsG5nz3qJqdk/vBj3tsAGgcZU31O6ot3
ZlnYFwGFYc+FK33JkbjH6SIRnGRUhDGZyVh9uijS+ywviJ1GtqMlPIQsjv12Kq1w
Nzj7uYKmFdWy8vRORMuumC8sXMjpd6LfHNNi7w9+tQeaOTaoIn1FRL2/l0+3CiEY
Slnd9LRNwSQhdbDfIpySnjFLLslgqN/VrlhqqUNKmmvIK4gdFAR+/5TWdKA4EADH
+v8AVbkasQIDAQABoz8wPTAdBgNVHQ4EFgQUs/Kax5l6nCk12CzM2Fo0MLUfXcMw
DwYDVR0TBAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQADggGB
AJOevXZ46h6TGRMSor3718Ln8URWc8olo9ilHfUiJnqchngyEi+Cp7YrFINxMaTm
CV6hm2B/tUdkAbHlq1bdUFao7Jdw/Zu/sBFRYxAwHRzDROn4V1PTYr+oQgZmZH6c
EOd1XwLzrUCkCGth+kjPxE4wKjgKAHYG06d7yOC0PJC9Ny6e2N9MadiYktlVUwDA
cfmABWgqcAcmXc34k3k0WgKEE0AU3XuJJiBHkrTUACK3mqbVtgEymkQDJtly6CNQ
SDssSM4SxyqfJW34lAyqf9GysKJj6LrpGRgYjRD+YsjCr43iTthPLMs4Z8pFRCHL
Tl6coFQJ8Ezh33fo/jqgBpEoV3gSVBzweiltHA1paiMGp16mvVYrnsAewS9FI8tR
+iip6rnlVzqpcpw43OeoUx5a/1P2atdQ5dKz8KirxxNHxGQ1FmX6+tnypszimBJj
zrbfIRxPezw8Me0qCLlmSA5MYQAD7O9RqigK/yUVj6zgvys8nhQJs/A4FaS2yvs7
+A==
-----END CERTIFICATE-----`,
  },
};

const connection = mysql.createConnection(config);

connection.connect((err) => {
  if (err) {
      console.error('Database connection failed:', err.message);
      process.exit(1);
  }
  console.log('Connected to MySQL database');
});

const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to the request object
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: "Forbidden: Invalid token" });
  }
};

// Endpoint to check if email exists in the database
app.post("/api/check-email", (req, res) => {
  const { userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const query = "SELECT * FROM Users WHERE email = ?";
  connection.query(query, [userEmail], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (results.length > 0) {
      return res.json({ success: true, exists: true });
    }

    res.json({ success: true, exists: false });
  });
});

// Endpoint to send OTP to user's email
app.post("/send-otp", async (req, res) => {
  const { userEmail } = req.body;

  if (!userEmail) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use your email service provider here
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Your OTP Code",
      text: `Your OTP code is: ${otp}`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`OTP sent to ${userEmail}: ${otp}`);
    res.status(200).json({ success: true, otp }); // Return OTP to the frontend
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

app.put("/api/update-password-by-email", (req, res) => {
  const { email, newEncryptedPassword } = req.body;

  // Validate input
  if (!email || !newEncryptedPassword) {
    return res.status(400).json({ success: false, message: "Email and new password are required." });
  }

  // SQL query to update the user's password for the given email
  const query = `
    UPDATE Users
    SET password = ?
    WHERE email = ?
  `;

  connection.query(query, [newEncryptedPassword, email], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  });
});

// Endpoint to handle user signup
app.post("/api/signup", async (req, res) => {
  const { userName, userEmail, encryptedPassword, userDob } = req.body;

  // Basic validation
  if (!userName || !userEmail || !encryptedPassword || !userDob) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  // SQL query to insert user data into the Users table
  const query = `
    INSERT INTO Users (name, email, password, dob)
    VALUES (?, ?, ?, ?)
  `;

  connection.query(query, [userName, userEmail, encryptedPassword, userDob], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ success: false, message: "Email already exists." });
      }
      console.error("Error inserting user data:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    const userId = result.insertId; // ID of the newly inserted user

    // Generate JWT Token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET);

    res.status(200).json({
      success: true,
      token, // Send the token to the client
    });
  });
});

// Endpoint to handle user login
app.get("/api/getCred", async (req, res) => {
  const { userEmail } = req.query; // Extract email from query parameters

  if (!userEmail) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  // SQL query to fetch the user's password and user_id based on the email
  const query = `
    SELECT password, user_id
    FROM Users
    WHERE email = ?
  `;

  connection.query(query, [userEmail], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }

    // Return the password and user_id
    res.status(200).json({
      success: true,
      userPassword: results[0].password,
      userId: results[0].user_id,
    });
  });
});

// Endpoint to generate JWT token for authenticated users
app.post("/api/generateAuthToken", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required." });
  }

  try {
    // Generate JWT Token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET);

    res.status(200).json({
      success: true,
      token, // Send the token to the client
    });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Endpoint to handle user profile setup
app.post("/api/profile-set-up", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the decoded token
  
  const {
    userGeneralGoal,
    userWeight,
    userHeight,
    userBodyType,
    userFitnessLevel,
    userWorkingOutSince,
    userHealthConditions,
    userGender,
  } = req.body;

  // Basic validation to ensure required fields are provided
  if (!userGeneralGoal || !userWeight || !userHeight || !userBodyType || !userFitnessLevel) {
    return res.status(400).json({ success: false, message: "All required fields must be provided." });
  }

  // First, check if a record exists for this userId
  const checkQuery = `SELECT user_id FROM Users WHERE user_id = ?`;
  
  connection.query(checkQuery, [userId], (checkErr, checkResult) => {
    if (checkErr) {
      console.error("Database check error:", checkErr);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    
    let query;
    let params;
    
    // If user exists, update the record
    if (checkResult.length > 0) {
      query = `
        UPDATE Users
        SET
          general_goal = ?,
          weight = ?,
          height = ?,
          body_type = ?,
          experience_level = ?,
          working_out_since = ?,
          health_conditions = ?,
          gender = ?
        WHERE
          user_id = ?
      `;
      
      params = [
        userGeneralGoal,
        userWeight,
        userHeight,
        userBodyType,
        userFitnessLevel,
        userWorkingOutSince,
        userHealthConditions,
        userGender,
        userId
      ];
    } 
    // If user doesn't exist, insert a new record
    else {
      query = `
        INSERT INTO Users (
          user_id,
          general_goal,
          weight,
          height,
          body_type,
          experience_level,
          working_out_since,
          health_conditions,
          gender
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      params = [
        userId,
        userGeneralGoal,
        userWeight,
        userHeight,
        userBodyType,
        userFitnessLevel,
        userWorkingOutSince,
        userHealthConditions,
        userGender
      ];
    }

    connection.query(query, params, (err, result) => {
      if (err) {
        console.error("Database operation error:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Operation failed." });
      }

      const operation = checkResult.length > 0 ? "updated" : "created";
      res.status(200).json({ success: true, message: `User profile ${operation} successfully.` });
    });
  });
});

// Endpoint to get the user's name
app.get("/api/getName", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the decoded token

  // SQL query to fetch the user's name
  const query = `
    SELECT name
    FROM Users
    WHERE user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Send the user's name in the response
    res.status(200).json({ success: true, userName: results[0].name });
  });
});

// Endpoint to get the user's activity for the last 7 days
app.get("/api/getActivity", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the decoded token

  // SQL query to fetch the last 7 activities for the user
  const query = `
    SELECT 
      DATE_FORMAT(timestamp, '%Y-%m-%d') AS activity_date, 
      steps, 
      workout, 
      calories, 
      sleep, 
      additional_comments
    FROM Activity
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT 7
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    // Structure the response as a key-value pair where date is the key
    const activitiesByDate = {};
    
    // If results exist, populate the activitiesByDate object
    if (results.length > 0) {
      results.forEach((row) => {
        activitiesByDate[row.activity_date] = {
          steps: row.steps,
          workout: row.workout,
          calories: row.calories,
          sleep: row.sleep,
          additional_comments: row.additional_comments,
        };
      });
    }

    // Always return success, even if no activities are found
    // The front-end will handle adding today's empty record
    res.status(200).json({ success: true, activities: activitiesByDate });
  });
});

// Endpoint to update or insert user activity
app.post("/api/updateActivity", authenticateToken, (req, res) => {
  const { date, steps, workout, calories, sleep, additional_comments } = req.body;
  const userId = req.user.userId; // Extract user ID from the token

  if (!date) {
    return res.status(400).json({ success: false, message: "Date is required." });
  }

  // First, check if an entry already exists for the same user_id and date
  const checkQuery = `
    SELECT activity_id
    FROM Activity
    WHERE user_id = ? AND DATE(timestamp) = ?
  `;

  connection.query(checkQuery, [userId, date], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Database error while checking for existing activity:", checkErr);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (checkResults.length > 0) {
      // Entry exists, so update it
      const updateQuery = `
        UPDATE Activity
        SET steps = ?, workout = ?, calories = ?, sleep = ?, additional_comments = ?
        WHERE activity_id = ?
      `;

      const activityId = checkResults[0].activity_id;

      connection.query(
        updateQuery,
        [steps, workout, calories, sleep, additional_comments, activityId],
        (updateErr, updateResults) => {
          if (updateErr) {
            console.error("Database error while updating activity:", updateErr);
            return res.status(500).json({ success: false, message: "Internal server error." });
          }

          return res.status(200).json({ success: true, message: "Activity updated successfully." });
        }
      );
    } else {
      // No entry exists, so insert a new one
      const insertQuery = `
        INSERT INTO Activity (user_id, steps, workout, calories, sleep, additional_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      connection.query(
        insertQuery,
        [userId, steps, workout, calories, sleep, additional_comments],
        (insertErr, insertResults) => {
          if (insertErr) {
            console.error("Database error while inserting activity:", insertErr);
            return res.status(500).json({ success: false, message: "Internal server error." });
          }

          return res.status(201).json({ success: true, message: "Activity created successfully." });
        }
      );
    }
  });
});

// Endpoint to update user profile
app.post("/api/updateProfile", authenticateToken, (req, res) => {
  const {
    userGeneralGoal,
    userWeight,
    userBodyType,
    userFitnessLevel,
    userWorkingOutSince,
    userHealthConditions,
  } = req.body;
  const userId = req.user.userId; // Extract user ID from the authenticated token

  // Validate required fields
  if (!userGeneralGoal || !userWeight || !userBodyType || !userFitnessLevel) {
    return res.status(400).json({ success: false, message: "Required fields are missing." });
  }

  // SQL query to update the user's profile in the Users table
  const updateQuery = `
    UPDATE Users
    SET 
      general_goal = ?,
      weight = ?,
      body_type = ?,
      experience_level = ?,
      working_out_since = ?,
      health_conditions = ?
    WHERE user_id = ?
  `;

  connection.query(
    updateQuery,
    [
      userGeneralGoal,
      userWeight,
      userBodyType,
      userFitnessLevel,
      userWorkingOutSince,
      userHealthConditions,
      userId,
    ],
    (err, results) => {
      if (err) {
        console.error("Database error while updating user profile:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "User profile not found." });
      }

      return res.status(200).json({ success: true, message: "User profile updated successfully." });
    }
  );
});


app.get("/api/check-existing-insights", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract user ID from the authenticated token
  const date = req.query.date; // Get the date from the query parameters

  // SQL query to fetch insights and tips for the given date or current date
  const query = `
    SELECT 
      insights,
      tips,
      DATE(date) AS insight_date
    FROM Insights
    WHERE user_id = ? AND DATE(date) = ?
  `;

  // Use the provided date or default to the current date
  const queryDate = date || new Date().toISOString().split("T")[0]; // Format today's date as YYYY-MM-DD

  connection.query(query, [userId, queryDate], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: `No insights or tips found for ${queryDate}.` });
    }

    // Send back the insights and tips data
    res.status(200).json({
      success: true,
      data: {
        insights: JSON.parse(results[0].insights), // Parse JSON string into an object
        tips: JSON.parse(results[0].tips), // Parse JSON string into an object
        date: results[0].insight_date,
      },
    });
  });
});

app.get("/api/get-user-password", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract user ID from the authenticated token

  // SQL query to fetch the user's password
  const query = `
    SELECT password
    FROM Users
    WHERE user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No password found for the user." });
    }

    // Send back the user's password
    res.status(200).json({
      success: true,
      data: {
        password: results[0].password,
      },
    });
  });
});

app.put("/api/update-password", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract user ID from the authenticated token
  const { newEncryptedPassword } = req.body; // Get the new encrypted password from the request body

  if (!newEncryptedPassword) {
    return res.status(400).json({ success: false, message: "New password is required." });
  }

  // SQL query to update the user's password
  const query = `
    UPDATE Users
    SET password = ?
    WHERE user_id = ?
  `;

  connection.query(query, [newEncryptedPassword, userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  });
});

app.post("/api/verify-email", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required." });
  }

  // SQL query to check if the email exists in the Users table
  const query = `
    SELECT id
    FROM Users
    WHERE email = ?
  `;

  connection.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "Email not found." });
    }

    // Respond with success if the email exists
    res.status(200).json({
      success: true,
      message: "Email found.",
    });
  });
});

// Endpoint to get user insights including profile and today's activity
app.get("/api/getInsights", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the decoded token

  // SQL query to fetch the user's details from Users table and today's activity from Activity table
  const query = `
    SELECT 
      u.general_goal,
      u.weight,
      u.height,
      TIMESTAMPDIFF(YEAR, u.dob, CURDATE()) AS age, -- Calculate age from DOB
      u.body_type,
      u.experience_level,
      u.health_conditions,
      u.gender,
      a.steps,
      a.workout,
      a.calories,
      a.sleep,
      a.additional_comments
    FROM Users u
    LEFT JOIN Activity a
    ON u.user_id = a.user_id AND DATE(a.timestamp) = CURDATE() -- Match today's date in Activity table
    WHERE u.user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No data found for the user." });
    }

    // Print the fetched data
    console.log("User Insights:", results[0]);

    // Send back the data in the response
    res.status(200).json({ success: true, data: results[0] });
  });
});

app.get("/api/activity/last7", authenticateToken, (req, res) => {
  const currentUserId = req.user.userId; // Extract the user ID from the authenticated token
  
  // SQL query to fetch the last 7 records for the user, ordered by timestamp
  const query = `
    SELECT 
      DATE(timestamp) AS date,
      steps,
      calories,
      sleep
    FROM Activity
    WHERE user_id = ?
    ORDER BY timestamp DESC
    LIMIT 7
  `;

  connection.query(query, [currentUserId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    // Transform the results into the required format
    const stepsData = results.map((record) => ({
      date: record.date,
      count: record.steps,
    }));

    const calorieData = results.map((record) => ({
      date: record.date,
      count: record.calories,
    }));

    const sleepData = results.map((record) => ({
      date: record.date,
      count: record.sleep,
    }));

    // Respond with the transformed data
    res.status(200).json({
      success: true,
      data: {
        stepsData,
        calorieData,
        sleepData,
      },
    });
  });
});

// Get conversation between two users
app.get("/api/messages/:receiverId", authenticateToken, (req, res) => {
  const senderId = req.user.userId;
  const receiverId = req.params.receiverId;
  
  const query = `
    SELECT m.message_id, m.sender_id, m.receiver_id, m.message_text, m.timestamp, m.read_status,
           u_sender.name as sender_name, u_receiver.name as receiver_name
    FROM Messages m
    JOIN Users u_sender ON m.sender_id = u_sender.user_id
    JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.timestamp ASC
  `;
  
  connection.query(query, [senderId, receiverId, receiverId, senderId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    
    // Mark messages as read
    const updateQuery = `
      UPDATE Messages
      SET read_status = TRUE
      WHERE sender_id = ? AND receiver_id = ? AND read_status = FALSE
    `;
    
    connection.query(updateQuery, [receiverId, senderId], (updateErr) => {
      if (updateErr) {
        console.error("Error updating read status:", updateErr);
      }
      
      res.status(200).json({ success: true, data: results });
    });
  });
});

// Send a new message
app.post("/api/messages", authenticateToken, (req, res) => {
  const senderId = req.user.userId;
  const { receiverId, message } = req.body;
  
  if (!receiverId || !message) {
    return res.status(400).json({ success: false, message: "Receiver ID and message are required." });
  }
  
  const query = `
    INSERT INTO Messages (sender_id, receiver_id, message_text)
    VALUES (?, ?, ?)
  `;
  
  connection.query(query, [senderId, receiverId, message], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    
    // Fetch the newly created message with user details
    const fetchQuery = `
      SELECT m.message_id, m.sender_id, m.receiver_id, m.message_text, m.timestamp, m.read_status,
             u_sender.name as sender_name, u_receiver.name as receiver_name
      FROM Messages m
      JOIN Users u_sender ON m.sender_id = u_sender.user_id
      JOIN Users u_receiver ON m.receiver_id = u_receiver.user_id
      WHERE m.message_id = ?
    `;
    
    connection.query(fetchQuery, [result.insertId], (fetchErr, fetchResult) => {
      if (fetchErr) {
        console.error("Error fetching new message:", fetchErr);
        return res.status(200).json({ 
          success: true, 
          message: "Message sent successfully.",
          data: { message_id: result.insertId }
        });
      }
      
      res.status(200).json({ 
        success: true, 
        message: "Message sent successfully.",
        data: fetchResult[0]
      });
    });
  });
});

// Get recent conversations (for a conversations list)
app.get("/api/conversations", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  const query = `
    SELECT 
      CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END AS conversation_with_id,
      u.name AS conversation_with_name,
      m.message_text AS last_message,
      m.timestamp AS last_message_time,
      SUM(CASE WHEN m.read_status = FALSE AND m.receiver_id = ? THEN 1 ELSE 0 END) AS unread_count
    FROM (
      SELECT m1.*
      FROM Messages m1
      JOIN (
        SELECT 
          CASE
            WHEN sender_id = ? THEN receiver_id
            ELSE sender_id
          END AS other_user,
          MAX(timestamp) as max_time
        FROM Messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY other_user
      ) m2 ON ((m1.sender_id = ? AND m1.receiver_id = m2.other_user) OR 
               (m1.sender_id = m2.other_user AND m1.receiver_id = ?)) 
         AND m1.timestamp = m2.max_time
    ) m
    JOIN Users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.user_id
    GROUP BY conversation_with_id, conversation_with_name, last_message, last_message_time
    ORDER BY last_message_time DESC
  `;
  
  connection.query(query, [userId, userId, userId, userId, userId, userId, userId, userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    
    res.status(200).json({ success: true, data: results });
  });
});

// Endpoint to save insights and tips
app.post("/api/set-insights-tips", authenticateToken, (req, res) => {
  const currentUserId = req.user.userId; // Extract the user ID from the authenticated token
  const { insights, tips } = req.body; // Destructure insights and tips from the request body

  if (!insights || !tips) {
    return res.status(400).json({ success: false, message: "Insights and tips are required." });
  }

  // SQL query to check if an entry with the same user_id and date exists
  const checkQuery = `
    SELECT insight_id 
    FROM Insights 
    WHERE user_id = ? AND DATE(date) = CURDATE()
  `;

  connection.query(checkQuery, [currentUserId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length > 0) {
      // If an entry exists, update the existing record
      const updateQuery = `
        UPDATE Insights
        SET insights = ?, tips = ?, date = NOW()
        WHERE insight_id = ?
      `;

      connection.query(
        updateQuery,
        [JSON.stringify(insights), JSON.stringify(tips), results[0].insight_id],
        (updateErr) => {
          if (updateErr) {
            console.error("Database update error:", updateErr);
            return res.status(500).json({ success: false, message: "Internal server error." });
          }

          res.status(200).json({ success: true, message: "Insights and tips successfully updated." });
        }
      );
    } else {
      // If no entry exists, insert a new record
      const insertQuery = `
        INSERT INTO Insights (user_id, insights, tips, date)
        VALUES (?, ?, ?, NOW())
      `;

      connection.query(
        insertQuery,
        [currentUserId, JSON.stringify(insights), JSON.stringify(tips)],
        (insertErr) => {
          if (insertErr) {
            console.error("Database insert error:", insertErr);
            return res.status(500).json({ success: false, message: "Internal server error." });
          }

          res.status(201).json({ success: true, message: "Insights and tips successfully saved." });
        }
      );
    }
  });
});

// Endpoint to get user profile data
app.get("/api/getProfile", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the authenticated token

  // SQL query to fetch the user's profile data from the Users table
  const query = `
    SELECT 
      general_goal,
      weight,
      height,
      body_type,
      experience_level AS fitness_level,
      working_out_since,
      health_conditions
    FROM Users
    WHERE user_id = ?
  `;

  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    // Send back the user profile data in the response
    res.status(200).json({ success: true, data: results[0] });
  });
});

app.get("/api/users/search", authenticateToken, (req, res) => {
  const searchTerm = req.query.q || '';
  const currentUserId = req.user.user_id;
  
  if (!searchTerm.trim()) {
    return res.status(200).json({ success: true, data: [] });
  }
  
  const query = `
    SELECT user_id, name
    FROM Users
    WHERE name LIKE ?
    LIMIT 20
  `;
  
  connection.query(query, [`%${searchTerm}%`], (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).json({ success: false, message: "Internal server error." });
    }
    
    res.status(200).json({ success: true, data: results });
  });
});


app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api/data', authenticateToken, (req, res) => {
  connection.query('SELECT * FROM Users', (err, results) => {
    if (err) {
      res.status(500).json({ error: 'Database query error' });
      return;
    }
    res.json(results);
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});