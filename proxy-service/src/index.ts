import express from "express";
import proxy from "express-http-proxy";

const app = express();

const TARGET_URL = "https://api.backpack.exchange";
const PORT = 5001;

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range"
    );
    next();
});

app.use("/", proxy(TARGET_URL));

app.listen(PORT, () => console.log(`Server started on PORT : ${PORT}`));
