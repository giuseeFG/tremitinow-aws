const https = require('https');

const FERRYHOPPER_BASE_URL = 'ferryhapi.uat.ferryhopper.com';
const FERRYHOPPER_API_KEY = '09fe3f6e-928b-41c8-a608-d680e8646b48';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

exports.handler = async (event) => {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        const { endpoint, method = 'GET', body, queryParams } = JSON.parse(event.body || '{}');
        
        if (!endpoint) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({ error: 'Missing endpoint parameter' })
            };
        }

        // Build query string if needed
        let path = `/${endpoint}`;
        if (queryParams && Object.keys(queryParams).length > 0) {
            const queryString = new URLSearchParams(queryParams).toString();
            path += `?${queryString}`;
        }

        // Prepare request options
        const options = {
            hostname: FERRYHOPPER_BASE_URL,
            path: path,
            method: method,
            headers: {
                'X-Api-Key': FERRYHOPPER_API_KEY,
                'Content-Type': 'application/json'
            }
        };

        // Make the request to FerryHopper API
        const response = await makeRequest(options, body);
        
        return {
            statusCode: response.statusCode,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(response.data)
        };
        
    } catch (error) {
        console.error('Lambda Error:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

function makeRequest(options, postData) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        data: parsedData
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        data: data
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        // Write data if POST request
        if (postData) {
            req.write(JSON.stringify(postData));
        }

        req.end();
    });
}