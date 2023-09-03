const puppeteer = require('puppeteer');
const jsdom = require('jsdom');
const mysql = require('mysql');
const sql = require('mssql');
const { JSDOM } = jsdom;

const config = {
  server: 'DESKTOP-SM42817\\MSSQLSERVER19',
  user: 'sa',
  password: 'Shahia01',
  database: 'Scraper',
  options: {
    trustedConnection: true,
    enableArithAbort: true,
    trustServerCertificate: true,
  },
};

(async () => {

  const startTime = performance.now();
  
  //#region SQL Server
  connectToSqlServer().then(async (data) => {
    const browser = await puppeteer.launch({
      headless: false,
      args: [

      ]
    });
    const page = await browser.newPage();
    await page.goto('https://cekdptonline.kpu.go.id/');
    let result = new Map();
    const totalData = data.length;
    let i = 0;

    for (const record of data) {
      i++;
      const nik = record.NIK;
      console.log(`NIK: ${nik}`);

      await page.focus('#__BVID__22');
      await page.keyboard.type(`${nik}`);
    
      await page.click('button.btn:nth-child(2)');
    
      await page.waitForTimeout(3000);
      const bodyHandle = await page.$('.h-100')
      const htmlResponse = await page.evaluate(body => body.innerHTML, bodyHandle);
    
      const { document } = new JSDOM(htmlResponse).window;
      const tps = document.querySelector("#root > main > div.container > div > div > div > div.card-body > div > div > div:nth-child(3) > div > div > div > p:nth-child(12)");
      const name = document.querySelector("#root > main > div.container > div > div > div > div.card-body > div > div > div:nth-child(3) > div > div > div > p:nth-child(3)");
      if (tps != null) {
        const tpstext = tps.textContent;
        record.TPS = tpstext;
        // console.log(tpstext);
        // result.set(`${nik}`, `${tpstext}`)             
      } else {
        record.TPS = "Not Found";
        console.log("Not Found");
      }

      if (name != null) {
        const nametext = name.textContent;
        record.Name = nametext;
        // console.log(nametext);
        // result.set(`${nik}`, `${nametext}`)             
      } else {
        record.Name = "Not Found";
        console.log("Not Found");
      }

      updateRecordInDatabase(record);
    
      if (i < totalData) {
        await page.click('.btn');
        let searchInput = await page.$('#__BVID__22');
        await searchInput.click({clickCount: 3});
        await searchInput.press('Backspace'); 
      } else {
        const endTime = performance.now();
        const totalRuntime = endTime - startTime;

        console.log(`Total Runtime: ${totalRuntime.toFixed(2)} milliseconds`);
        await browser.close();
      }
    }
  })
  
  //#endregion SQL Server

  
  //#region MYSQL
  // const browser = await puppeteer.launch({
  //     headless: false,
  //     args: [

  //     ]
  // });
  // const page = await browser.newPage();
  // await page.goto('https://cekdptonline.kpu.go.id/');
  // let result = new Map();

  // const connection = connectToMySql();
  // connection.query('SELECT NIK FROM IdentityIDN LIMIT 10', async (error, results, fields) => {
  //     if (error) {
  //       console.error('Error executing query:', error);
  //       return;
  //     }

  //     const totalData = results.length;
  //     let i = 0;
  //     // Loop through each record
  //     for (const record of results) {
  //       i++;
  //       const { nik } = record;
  //       // console.log(`NIK: ${nik}`);

  //       await page.focus('#__BVID__21');
  //       await page.keyboard.type(`${nik}`);

  //       await page.click('button.btn:nth-child(2)');

  //       await page.waitForTimeout(3000);
  //       const bodyHandle = await page.$('.h-100')
  //       const htmlResponse = await page.evaluate(body => body.innerHTML, bodyHandle);

  //       const { document } = new JSDOM(htmlResponse).window;
  //       // console.log(document);
  //       const tps = document.querySelector("#root > main > div.container > div > div > div > div.card-body > div > div > div:nth-child(3) > div > div > div > p:nth-child(12)");
  //       if (tps != null) {
  //           const tpstext = tps.textContent;
  //           // console.log(tpstext);
  //           result.set(`${nik}`, `${tpstext}`)             
  //       } else {
  //           console.log("Not Found");
  //       }

  //       if (i < totalData) {
  //         await page.click('.btn');
  //         let searchInput = await page.$('#__BVID__21');
  //         await searchInput.click({clickCount: 3});
  //         await searchInput.press('Backspace'); 
  //       } else {
  //         for (const [key, value] of result.entries()) {
  //           console.log(`Key: ${key}, Value: ${value}`);
  //           const updateQuery = `UPDATE dpt SET tps = '${value}' WHERE nik = ${key}`;

  //           connection.query(updateQuery, (error) => {
  //               if (error) {
  //               console.error('Error updating record:', error);
  //               return;
  //               }

  //               console.log(`Record with NIK ${key} updated successfully!`);
  //           });

  //         }
  //         connection.end();
  //         await browser.close();
  //       }
  //     }
  //   });
  //#endregion MYSQL

})();

function connectToMySql() {
  const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dpt',
  });

  connection.connect((error) => {
    if (error) {
      console.error('Error connecting to MySQL database:', error);
      return;
    }

    console.log('Connected to MySQL database!');
  });

  return connection;
}

async function connectToSqlServer() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT TOP 10000 NIK FROM IdentityIDN WHERE NIK LIKE '3319065%' AND Name is null");

    return result.recordset;
  } catch (err) {
    console.error("Error occurred:", err);
    throw err;
  }
}

async function updateRecordInDatabase(record) {
  try {
    const pool = await sql.connect(config);
    const updateQuery = `UPDATE IdentityIDN SET Name = @name, TPS = @tps WHERE nik = @id`;
    const request = pool.request();
    request.input("name", sql.VarChar, record.Name);
    request.input("tps", sql.VarChar, record.TPS);
    request.input("id", sql.VarChar, record.NIK);

    const result = await request.query(updateQuery);
    console.log("NIK:" + record.NIK + " was updated successfully");
  } catch (err) {
    console.error("Error occurred while updating:", err);
    throw err;
  }
}
