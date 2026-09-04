const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req,res) =>{
    res.status(200).json({
        status: "ok",
        message: "The process is alive"
    });
});

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
});