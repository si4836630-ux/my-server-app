const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// 반드시 배포 환경에서는 환경변수로 변경하세요.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "너임마청년;

const LOG_FILE = path.join(__dirname, "logs.txt");

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: false }));

// -------------------------
// 메인 페이지
// ----------------...