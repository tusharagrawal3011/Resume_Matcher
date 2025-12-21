import express from "express";
import router from "./routes";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 3000;

app.use("/", router);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
