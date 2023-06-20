import express from "express"

const app = express()
const port = 1983

app.use(express.static("examples"))

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
