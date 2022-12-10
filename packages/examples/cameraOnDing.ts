import { PushNotificationAction, RingApi } from 'ring-client-api'
import { readFile, writeFile } from 'fs'
import { promisify } from 'util'

import path = require("path")

function getOutputFile(outputdir: string, ring_event_id: string, ding_action: string) {
  const event_ts = new Date()
  return path.join(
    outputdir,
    event_ts.getFullYear() + "-" +
    event_ts.toLocaleDateString('en-US', {month: '2-digit'}) + "-" +
    event_ts.getDate().toString().padStart(2, '0') + "_" + 
    event_ts.getHours().toString().padStart(2, '0') + ":" + 
    event_ts.getMinutes().toString().padStart(2, '0') + ":" +
    event_ts.getSeconds().toString().padStart(2, '0') +
    (event_ts.getHours() >= 12 ? 'pm' : 'am') +
    "_" + 
    ding_action +
    "_" +
    ring_event_id +
    "_" + 'part0.mp4')
}
 

async function example(mytokenFile: any,outputdir: any,duration: any) {
  console.log('Start Ring Api')
  const currentToken = await promisify(readFile)(mytokenFile);
  const mytoken = currentToken.toString().replace(/\r|\n/g, '');

  const ringApi = new RingApi({
      refreshToken: mytoken,
      debug: false,
    }),
    [camera] = await ringApi.getCameras()

  if (!camera) {
    console.log('No cameras found')
    return
  }

  console.log('Start Refresh Token Updates')
  ringApi.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
      console.log('Refresh Token Updated: ')

      // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
      // Here is an example using a .env file for configuration
      if (!oldRefreshToken) {
        return
      }

      const currentConfig = await promisify(readFile)(mytokenFile),
        updatedConfig = currentConfig
          .toString()
          .replace(oldRefreshToken, newRefreshToken)
        
      await promisify(writeFile)(mytokenFile, updatedConfig)
    }
  )

  console.log('Start Express serve-index');
  const express = require('express')
  const serveIndex = require('serve-index')
  const app = express()
  app.use(express.static(outputdir))
  app.use(serveIndex(outputdir, {'view': 'details', 'fileList': 'name'}))
  app.use('/ring', express.static(outputdir))
  app.use('/ring', serveIndex(outputdir, {'view': 'details', 'fileList': 'name'}))
  app.get('/ring/record', async (req: any, res: any) => {

    const ding_id = '';
    const ding_action = "onDemand";
    const output_file = getOutputFile(
      outputdir,
      ding_id,
      ding_action)
    
    console.log(output_file)
    camera.recordToFile(output_file, duration)

    res.send(
      `<script> setTimeout(function() { window.location.href = '/ring'; }, ` + (duration - 2) * 1000 + `); </script>
      <p>Recording</p>
      <p id="demo"></p>
      <a href='/ring' class='button'>Back to video index</a>

      <script>
      // Set the date we're counting down to
      var countDownDate = new Date().getTime() + (` + duration * 1000 + `);

      // Update the count down every 1 second
      var x = setInterval(function() {
      // Get today's date and time
      var now = new Date().getTime();
      // Find the distance between now and the count down date
      var distance = countDownDate - now;
      // Time calculations for days, hours, minutes and seconds
      var days = Math.floor(distance / (1000 * 60 * 60 * 24));
      var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);
      // Output the result in an element with id="demo"
      document.getElementById("demo").innerHTML = days + "d " + hours + "h "
      + minutes + "m " + seconds + "s ";
      }, 1000);
      </script>`)
  })
  app.listen(3000, () => {
    console.log(
      'Listening on port 3000.'
    )
  })

  var glob = require("glob")

  console.log('Doorbots connection: ' + camera.data.alerts.connection)
  var ring_event_id: string = ''
  var latest_event_id: string = ''
  camera.onNewNotification.subscribe((ding) => {
    const event =
      ding.action === PushNotificationAction.Motion ? 'motion'
      : ding.action === PushNotificationAction.Ding ? 'ding'
      : `Video started (${ding.action})`

    console.log(
      `${event} on ${camera.name} camera. Ding id ${
        ding.ding.id
      }.  Received at ${new Date()}`)

    const ring_event_id = `${ding.ding.id}`
    const output_file = getOutputFile(
      outputdir,
      ring_event_id,
      `${ding.action}`) 
   
    try {
      var files = glob.sync(path.join(outputdir, "*" + ring_event_id + "_*.mp4"))
      if (files.length > 0 || latest_event_id == ring_event_id) {
        console.log('Already on Recoding for: ' + files)
        console.log('Latest event id : ' + latest_event_id)
        console.log('Current event id: ' + ring_event_id)
      } else {
        console.log(output_file)
        latest_event_id = ring_event_id
        camera.recordToFile(output_file, duration)
      }
    } catch(err) { 
      console.error(err)
    }
  })

  console.log('Listening for motion and doorbell presses on your cameras.')
}

// print process.argv
var args = process.argv.slice(2);
var outputdir = args[0]
var duration = args[1]
var tokenFile = args[2]

try {
  example(tokenFile, outputdir, duration)
} catch (err) {
  console.log('err', err);
}
