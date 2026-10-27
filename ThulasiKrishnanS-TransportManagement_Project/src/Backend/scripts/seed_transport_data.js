'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const routes = [
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - BUS No 17', vehicleid: 'BUS-17', busLabel: 'Bus No 17', seats: 60, stages: ['Sripuram', 'Arunagiri Theater', 'Lakshmi Mahal (Town)', 'Ganesh Theater', 'Kalanai School', 'Katchi Mandapam', 'Valukodai', 'Thonadr Sannathi', 'Pothees', 'Nainarkulam Pillayar Kovil', 'Santhimarithamman Kovil'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - BUS No 9', vehicleid: 'BUS-9', busLabel: 'Bus No 9', seats: 60, stages: ['VMS Kalyana Mandapam', 'Sevai Illam', 'Thiyagaraj Nagar EB', 'Thiyagaraj Nagar', 'Pushpalatha School', 'Rajagopalapuram', 'Rahmath Nagar', 'Potal'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - BUS No 13', vehicleid: 'BUS-13', busLabel: 'Bus No 13', seats: 60, stages: ['Krishna Hospital', 'Lakshmimahal', 'VM Chathiram', 'KTC Nagar'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - BUS No 23', vehicleid: 'BUS-23', busLabel: 'Bus No 23', seats: 56, stages: ['Palay Bus Stand', 'Vaikal Palam', 'TV Point (Murugankurichi)', 'Chennai Silks (Via Vannerpettai)', 'Kokirakulam', 'Junction (Shanthi Sweets)', 'Ram Theatre', 'Amma Mess', 'Thachanallur Bypass', 'Thathanuthoo', 'Durayur', 'Gangai Kondan', 'Sannathu Puthukudi'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - NEC BUS No 28', vehicleid: 'NEC-28', busLabel: 'NEC Bus No 28', seats: 60, stages: ['New Bus Stand', 'Xavier Colony', 'Reliance Signal', 'Kuruchi', 'Apple Tree (Vannerpettai)', 'KPN Travels', 'Thachanallur Bypass', 'Ganapathi Mill', 'Gangai Kondan', 'Thalavaipuram'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - BUS No 25', vehicleid: 'BUS-25', busLabel: 'Bus No 25', seats: 55, stages: ['Pettai (ITI)', 'Municipality', 'Police Station', 'Rottikadai', 'Chekadi', 'Kodeswara Nagar', 'Sankar Nagar', 'Salaiputhur'] },
  { city: 'Tirunelveli', label: 'TIRUNELVELI ROUTE - NEC BUS-1', vehicleid: 'NEC-1', busLabel: 'NEC Bus 1', seats: 55, stages: ['Sudalai Kovil', 'Xerox Point', 'Annai Kalyana Mandapam', 'Jeba Garden', 'Bharathi Nagar', 'A1 Parota Stall', 'Anbu Nagar Water Tank'] },
  { city: 'Kayathar', label: 'KAYATHAR ROUTE - BUS No 19', vehicleid: 'BUS-19', busLabel: 'Bus No 19', seats: 60, stages: ['Kayathar (Thevarkulam Road)', 'Kayathar (New Bus Stand)', 'Kayathar (Kadamboor Road)', 'Kayathar (Sivanarayanan Kalyana Mandapam)', 'Salaiputhur', 'Toll Gate', 'Savalaperi', 'Thalavaipuram', 'Villicheri', 'Idaiseval', 'Idaiseval Colony'] },
  { city: 'Thoothukudi', label: 'THOOTHUKUDI ROUTE - BUS No 8', vehicleid: 'BUS-8', busLabel: 'Bus No 8', seats: 60, stages: ['Annanagar', 'Railway 4 No Gate', 'VVD Signal', 'New Bus Stand'] },
  { city: 'Thoothukudi', label: 'THOOTHUKUDI ROUTE - BUS No 20', vehicleid: 'BUS-20', busLabel: 'Bus No 20', seats: 60, stages: ['SPIC Nagar', 'Camp II', 'CAMPI', 'Old Harbor', 'Thanthi Office', 'Chathiram', 'New Bus Stand'] },
  { city: 'Thoothukudi', label: 'THOOTHUKUDI ROUTE - BUS No 3', vehicleid: 'BUS-3-TTK', busLabel: 'Bus No 3', seats: 55, stages: ['Briyant Nagar (Kamarajar College)', 'Palli Vasal', 'Miller Puram', 'Government Polytechnic', '3rd Mile', 'Madathur Bypass', 'Arasaradi (Toll Gate)', 'Valasamuthiram', 'Kurukkusalai', 'Cholapuram', 'Ethillappan Naikenpatti'] },
  { city: 'Thoothukudi', label: 'THOOTHUKUDI ROUTE - BUS No 26', vehicleid: 'BUS-26-TTK', busLabel: 'Bus No 26', seats: 55, stages: ['New Bus Stand', 'KTC Nagar'] },
  { city: 'Thoothukudi', label: 'THOOTHUKUDI ROUTE - LAPC-13', vehicleid: 'LAPC-13', busLabel: 'LAPC-13', seats: 52, stages: ['Thoothukudi New Bus Stand', 'Samy Bulk', 'APC College', 'KTC Nagar', 'Kurukkusalai', 'Eppothumvendran', 'Cholapuram', 'Keela Iral'] },
  { city: 'Puthiyamputhur', label: 'PUTHIYAMPUTHUR ROUTE - LAPC-7', vehicleid: 'LAPC-7', busLabel: 'LAPC-7', seats: 60, stages: ['Puthiyamputhur', 'Parampoor', 'Ottapidaram', 'Venkatachalapuram', 'Keela Mudiman', 'Pasuvanthanai', 'Kuruvinatham', 'Kamanayakenpatti'] },
  { city: 'Duraiyur', label: 'DURAIYUR ROUTE - BUS No 6', vehicleid: 'BUS-6', busLabel: 'Bus No 6', seats: 60, stages: ['Duraiyur', 'Sivanthipatti', 'Karisalkulam', 'Kilavipatti', 'Duraisamypuram', 'Pandavarmangalam', 'Nayara Bulk', 'Nadar School (Saravana Store)', 'John Bon Stop', 'Padma Hospital'] },
  { city: 'Ettayapuram', label: 'ETTAYAPURAM ROUTE - BUS No 26', vehicleid: 'BUS-26-ETT', busLabel: 'Bus No 26', seats: 56, stages: ['Ettayapuram Rose Gate', 'Ettayapuram (Thevar Silai)', 'Ettayapuram (Keelavasal)', 'Ettayapuram (Melavasal)', 'Ettayapuram Bus Stand', 'Kansapuram', 'Municipality', 'Ilampoovanam', 'Kumaragiri', 'Thittangulam'] },
  { city: 'Vilathikulam', label: 'VILATHIKULAM ROUTE - LAPC-4', vehicleid: 'LAPC-4', busLabel: 'LAPC-4', seats: 60, stages: ['Meenakshi Amman Kovil', 'Bus Stand', 'Theatre Stop', 'Pillayar Kovil', 'Subramaniyapuram', 'Pillaiyar Natham', 'Padarntha Puli', 'Ettayapuram Keela Vasal', 'Ettayapuram Mela Vasal', 'SIPCOT', 'Honda Showroom', 'Shanmuga Theater'] },
  { city: 'Aruppukottai', label: 'ARUPPUKOTTAI ROUTE - BUS No 31', vehicleid: 'BUS-31', busLabel: 'Bus No 31', seats: 40, stages: ['Jayavilas Shed', 'New Bus Stand', 'Thanga Mayil Jewellery', 'K.M. Medical', 'Ilayarani Theatre', 'Government Hospital (GH)', 'Ramasamypuram', 'Sethurajapuram', 'Pandalkudi Bazar', 'Pandalkudi Vilakku', 'Mela Karanthai', 'Thappathi', 'Thapathi Muham', 'Kottur', 'Sinthalakarai'] },
  { city: 'Sattur', label: 'SATTUR ROUTE - BUS No 15', vehicleid: 'BUS-15', busLabel: 'Bus No 15', seats: 60, stages: ['K.R. Mill', 'Devi Theater', 'Venkatachalapuram (Sattur)', 'NGO Colony (Bulk)', 'PRC Depo (Sattur)', 'Fire Service (Sattur)', 'Bus Stand', 'Police Station', 'Pethureddypatti', 'Subbulapuram', 'Valli Mill', 'Pulvaipatti (Sattur)', 'Nalli Chathiram', 'Nalli', 'Sivananthapuram'] },
  { city: 'Sivakasi', label: 'SIVAKASI ROUTE - BUS No 16', vehicleid: 'BUS-16', busLabel: 'Bus No 16', seats: 60, stages: ['RSR Shed', 'Maninagar', 'Sivakasi Bus Stand', 'Bypass (Thiruthangal)', 'Paraipatti', 'Sundarrajapuram', 'Anupankulam', 'Chinnakamanpatti', 'Mettamalai', 'River Bridge (Sattur)', 'Kollapatti Vilakku', 'Sadaiyampatti', 'Periyaodaipatti', 'Uppthur (Vilakku)', 'Subbaiahpuram (Sattur)'] },
  { city: 'Virudhunagar', label: 'VIRUDHUNAGAR ROUTE - LAP-12', vehicleid: 'LAP-12', busLabel: 'LAP-12', seats: 40, stages: ['Post Office', 'Government Hospital (GH)', 'Allampatti', 'River Bridge (VNR)', 'Library (Old Bus Stand)', 'Karmathimadam', 'New Bus Stand', 'Collector Office', 'Soolakarai', 'R.R. Nagar', 'Audaiyapuram Gate', 'Naduvapatti', 'Padanthaal Bypass (Sattur)'] },
  { city: 'Rajapalayam', label: 'RAJAPALAYAM ROUTE - NEC BUS-27', vehicleid: 'NEC-27', busLabel: 'NEC Bus 27', seats: 56, stages: ['Thiropathi Amman Kovil', 'Old Bus Stand (NTR Super Market)', 'Jawahar Maithanam', 'New Bus Stand', 'Murambu', 'Retiyapatti', 'Kalingapatti', 'Chathirapatti', 'Thiruvengadam', 'Sangupatti', 'Maiparai', 'Naduvapatti', 'Sipiparai', 'Nakalamuthanpatti', 'Subhanagar'] },
  { city: 'Ilayarasanendal', label: 'ILAYARASANENDAL ROUTE - NEC-2', vehicleid: 'NEC-2', busLabel: 'NEC-2', seats: 40, stages: ['Illayarasanenthal', 'Othakadai', 'GVN College', 'New Appaneri', 'Sai Ram Nagar', 'Radhakrishna Nagar', 'LPL Park', 'Old Appaneri'] },
  { city: 'Sankarankovil', label: 'SANKARANKOVIL ROUTE - LAPC-5', vehicleid: 'LAPC-5', busLabel: 'LAPC-5', seats: 60, stages: ['Railway Gate', 'Iyyapankovil', 'Water Tank', 'Assembly Lodge', 'Shanthi Clinic', 'Tea Shop', 'New Bus Stand', 'Super Market', 'Mahalakshmi School', 'Chithamparapuram Vilakku', 'Sevalkulam', 'Vahai Kulam'] },
  { city: 'Kalugumalai', label: 'KALUGUMALAI ROUTE - LAP-11', vehicleid: 'LAP-11-KLG', busLabel: 'LAP-11', seats: 40, stages: ['Kalugumalai (New Bus Stand)', 'Kovilvasal', 'Kalugumalai (Police Station)', 'Kumarapuram', 'Kalangaraipatti', 'Sankaralingapuram', 'Kallurani', 'Vanaramutti', 'Vanaramutti (School)', 'M. Duraisamy Puram', 'Mudukkumeedanpatti', 'Nalatthin Puthur'] },
  { city: 'Kovilpatti', label: 'KOVILPATTI (RTO OFFICE) ROUTE - NEC-24', vehicleid: 'NEC-24', busLabel: 'NEC-24', seats: 56, stages: ['RTO Office', 'Chinthamai Nagar', 'Ravikumar Water', 'Loyal Mill Colony', 'New Road (Railway Station)', 'Ramasamy Theater', 'EB Colony'] },
  { city: 'Kovilpatti', label: 'KOVILPATTI (STATE BANK COLONY) ROUTE - NEC-30', vehicleid: 'NEC-30', busLabel: 'NEC-30', seats: 60, stages: ['State Bank Colony', 'Original Compound', 'Police Quarters', 'Arun Bakery', 'Salaiputhur'] },
  { city: 'Kovilpatti', label: 'KOVILPATTI (NADAR SCHOOL) ROUTE - NEC-12', vehicleid: 'NEC-12', busLabel: 'NEC-12', seats: 60, stages: ['Nadar School', 'John Born'] },
  { city: 'Kovilpatti', label: 'KOVILPATTI (BUS STAND) ROUTE - NEC-18', vehicleid: 'NEC-18', busLabel: 'NEC-18', seats: 60, stages: ['Kovilpatti New Bus Stand', 'TVS', 'Railway Line Subway', 'Bus Stand', 'Raj Mahal', 'Bypass (Maniyachi)'] },
  { city: 'Kovilpatti', label: 'MANTHITHOPPU ROUTE - LAPC-8', vehicleid: 'LAPC-8', busLabel: 'LAPC-8', seats: 55, stages: ['Manthithoppu', 'Essar Bulk', 'Thendral Nagar', 'Annamalai Nagar', 'Annai Theresa Nagar', 'Liberty', 'Bombay Sweets', 'Punitha Om', 'Kamaraj Nagar'] },
  { city: 'Kovilpatti', label: 'KOVILPATTI (INNER) ROUTE - LAP-11', vehicleid: 'LAP-11-KVP', busLabel: 'LAP-11', seats: 40, stages: ['SIPCOT', 'Honda Show Room', 'Veterinary Hospital', 'Meena Hotel', 'Mangala Vinayagar Kovil', 'Kaliamman Kovil', 'A.V. School', 'Padma Hospital'] }
];

const randomInt = (min, max) => crypto.randomInt(min, max + 1);
const randomCode = (prefix, size = 6) => `${prefix}-${crypto.randomBytes(4).toString('hex').slice(0, size).toUpperCase()}`;
const timeString = (minutes) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`;
const dateString = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

async function main() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'tms_db',
    port: Number(process.env.DB_PORT || 3306)
  });
  try {
    const [[database]] = await db.query('SELECT DATABASE() AS name');
    if (database.name !== 'tms_db') throw new Error(`Expected tms_db, got ${database.name}`);
    const vehicleIds = routes.map(route => route.vehicleid.toLowerCase());
    if (new Set(vehicleIds).size !== vehicleIds.length) throw new Error('Vehicle IDs must be unique');
    const [existingVehicles] = await db.query(
      `SELECT vehicleid FROM vehicle WHERE vehicleid IN (${routes.map(() => '?').join(',')})`,
      routes.map(route => route.vehicleid)
    );
    if (existingVehicles.length) throw new Error(`Vehicle IDs already exist: ${existingVehicles.map(row => row.vehicleid).join(', ')}`);
    const [existingDrivers] = await db.query(
      `SELECT staffcode FROM driver WHERE staffcode IN (${routes.map((_, index) => '?').join(',')})`,
      routes.map((_, index) => `GEN-DRV-${String(index + 1).padStart(3, '0')}`)
    );
    if (existingDrivers.length) throw new Error('Generated driver records already exist; refusing to create duplicate drivers');

    await db.beginTransaction();
    let stageCount = 0;
    try {
      for (let index = 0; index < routes.length; index++) {
        const route = routes[index];
        const routeid = randomCode('RT');
        const distance = Number((Math.max(8, route.stages.length * 2.2) + randomInt(100, 450) / 10).toFixed(2));
        await db.execute(
          'INSERT INTO route (routeid, routename, city, totalstages, totaldistance) VALUES (?, ?, ?, ?, ?)',
          [routeid, route.label, route.city, route.stages.length, distance]
        );

        let arrival = randomInt(390, 450);
        for (let stopIndex = 0; stopIndex < route.stages.length; stopIndex++) {
          const stageid = randomCode('ST');
          const departure = arrival + 5;
          const fee = randomInt(40, 350);
          await db.execute(
            'INSERT INTO stage (stageid, stagename, city, routeid, arrivaltime, departureTime, fee) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [stageid, route.stages[stopIndex], route.city, routeid, timeString(arrival), timeString(departure), fee]
          );
          arrival += randomInt(8, 18);
          stageCount++;
        }

        const registrationdate = dateString(randomInt(2020, 2025), randomInt(1, 12), randomInt(1, 28));
        const purchasedate = dateString(randomInt(2018, 2024), randomInt(1, 12), randomInt(1, 28));
        const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        await db.execute(
          'INSERT INTO vehicle (vehicleid, vehicletype, seatcapacity, registrationno, routeid, registrationdate, purchasedate, vendorid, rcno, registrationplace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [route.vehicleid, 'Bus', route.seats, route.vehicleid, routeid, registrationdate, purchasedate, `GEN-VENDOR-${suffix}`, `GEN-RC-${suffix}`, route.city]
        );

        const driverNumber = String(index + 1).padStart(3, '0');
        await db.execute(
          'INSERT INTO driver (staffcode, staffname, vehicleid, city, state, driver_type, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [`GEN-DRV-${driverNumber}`, `Generated Driver ${driverNumber}`, route.vehicleid, route.city, 'Tamil Nadu', 'permanent', `generated-driver-${driverNumber}@example.invalid`]
        );

        const permitSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
        const issued = dateString(2026, randomInt(1, 6), randomInt(1, 28));
        await db.execute(
          'INSERT INTO permit (vehicleid, permitno, permittype, issuedate, expirydate, status) VALUES (?, ?, ?, ?, ?, ?)',
          [route.vehicleid, `GEN-PER-${permitSuffix}`, 'Generated transport permit - verify', issued, dateString(2028, randomInt(1, 12), randomInt(1, 28)), 'Pending verification']
        );
        await db.execute(
          'INSERT INTO insurance (vehicleid, policyno, companyname, issuedate, expirydate, premiumamount) VALUES (?, ?, ?, ?, ?, ?)',
          [route.vehicleid, `GEN-INS-${permitSuffix}`, 'Generated placeholder insurer - verify', issued, dateString(2027, randomInt(1, 12), randomInt(1, 28)), randomInt(12000, 40000)]
        );
        await db.execute(
          'INSERT INTO fc (vehicleid, fcno, issuedate, expirydate, status) VALUES (?, ?, ?, ?, ?)',
          [route.vehicleid, `GEN-FC-${permitSuffix}`, issued, dateString(2027, randomInt(1, 12), randomInt(1, 28)), 'Pending verification']
        );
      }
      await db.commit();
    } catch (error) {
      await db.rollback();
      throw error;
    }
    console.log(`Seeded ${routes.length} routes, ${stageCount} stages, ${routes.length} vehicles, ${routes.length} generated drivers, ${routes.length} permits, ${routes.length} insurance records, and ${routes.length} FC records into ${database.name}.`);
    console.log('Route IDs, stage IDs, distances, stage fees, and vehicle compliance values were generated. Generated drivers and compliance values are placeholders and require replacement/verification before real operations.');
  } finally {
    await db.end();
  }
}

main().catch(error => {
  console.error('Seed failed:', error.code || error.message);
  process.exitCode = 1;
});
