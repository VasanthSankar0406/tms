const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000';
const TEMP_CODE = 'TEMP_TEST_' + Date.now();
const PERM_CODE = 'PERM_TEST_' + Date.now();

async function testUpdateDriver() {
    try {
        console.log('--- Creating Temporary Driver ---');
        const tempForm = new FormData();
        tempForm.append('driver_type', 'temporary');
        tempForm.append('staffcode', TEMP_CODE);
        tempForm.append('staffname', 'Temp Driver Original');
        tempForm.append('streetname', 'Original St');
        tempForm.append('city', 'Original City');
        tempForm.append('mobileno', '1111111111');
        await axios.post(`${BASE_URL}/addDriver`, tempForm, { headers: tempForm.getHeaders() });
        console.log('Temporary Driver Created');

        console.log('--- Updating Temporary Driver (Simplified Form) ---');
        const updateTempForm = new FormData();
        updateTempForm.append('driver_type', 'temporary');
        updateTempForm.append('staffname', 'Temp Driver Updated');
        updateTempForm.append('streetname', 'Updated St');
        updateTempForm.append('city', 'Updated City');
        updateTempForm.append('mobileno', '2222222222');
        // Simulate frontend sending empty strings for permanent fields
        updateTempForm.append('vehicleid', '');
        updateTempForm.append('doorno', '');
        updateTempForm.append('pincode', '');
        updateTempForm.append('state', '');

        const updateTempRes = await axios.put(`${BASE_URL}/updateDriver/${TEMP_CODE}`, updateTempForm, {
            headers: updateTempForm.getHeaders()
        });
        console.log('Update Temporary Driver Response:', updateTempRes.data);

        // Clean up
        await axios.delete(`${BASE_URL}/deleteDriver/${TEMP_CODE}`);

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testUpdateDriver();
