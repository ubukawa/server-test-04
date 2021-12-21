var express = require('express')
var router = express.Router()
const config = require('config')
const fs = require('fs')
const cors = require('cors')

// config constants
//const mbtilesDir = config.get('mbtilesDir')
const tilemapDir = config.get('tilemapDir')
const maxTiles = config.get('maxTiles')

// global variables
let busy = false

var app = express()
app.use(cors())


//GET Tile(router)- t,left,top,m,ny are extracted from the path
router.get(`/:t/:z/:row/:column/:width/:height`,  //need to think about other request f=json, index.json etc
 async function(req, res) {
  busy = true
  const t = req.params.t
  const z = parseInt(req.params.z)
  const row = parseInt(req.params.row)
  const column = parseInt(req.params.column)
  const width = parseInt(req.params.width)
  const height = parseInt(req.params.height)
  var tmPath = `${tilemapDir}/${t}/${z}/${row}/${column}/${width}/${height}/index.json`
  var maxTileZ = maxTiles[t]
  //var maxTileZ = 10

  if(z > maxTileZ){
    res.json({"error":{"code":422,"message":"Tiles not present","details":[]}})
  } else {
  if(fs.existsSync( tmPath )){
    //res.send( `${tilemapDir}/${t}/${z}/${left}/${top}/${m}/${n}/index.json` )
    var tmapdata = [1,1,1,1]
    res.json({ adjusted: false , location: {left: row, top: column, width: width, height: height}, data: tmapdata})
    /* failed////////////////
    res.sendFile( __dirname + '/' + tilemapDir + '/' + t + '/' + z + '/' + left + '/' + top + '/' + m + '/' +  n + '/' + 'index.json', (err) => {
    if (err) {
            res.sendStatus(400);
          } else {
            console.log(`${tmPath} sending completed`);
          }   
    })
    *////////////////////////
    //console.log(tmPath)
    busy = false
  } else {
    console.log(tmPath)
    res.status(404).send(`tilemap not found: /${t}/${z}/${row}/${column}/${width}/${height}`)
    busy = false
  }
}
}
)

module.exports = router;
