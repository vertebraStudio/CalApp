import fetch from 'node-fetch'

const FATSECRET_CLIENT_ID = '19e86e5a43fb4d84bc7f5da8ca744505'
const FATSECRET_CLIENT_SECRET = '00cfbb43a2c6449bb257e6cc6a930f24'
const query = 'manzana'

async function run() {
    try {
        const basicAuth = Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString('base64')
        const tokenParams = new URLSearchParams()
        tokenParams.append('grant_type', 'client_credentials')
        tokenParams.append('scope', 'basic')

        console.log('Fetching token...')
        const tokenRes = await fetch('https://oauth.fatsecret.com/connect/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenParams,
        })

        if (!tokenRes.ok) throw new Error(`FatSecret Token Error: ${await tokenRes.text()}`)
        const { access_token } = await tokenRes.json()
        console.log('Token:', access_token.slice(0, 10) + '...')

        console.log('Searching in FatSecret...')
        const searchUrl = new URL('https://platform.fatsecret.com/rest/server.api')
        searchUrl.searchParams.append('method', 'foods.search')
        searchUrl.searchParams.append('search_expression', query)
        searchUrl.searchParams.append('format', 'json')
        searchUrl.searchParams.append('max_results', '3')

        const searchRes = await fetch(searchUrl.toString(), {
            headers: { 'Authorization': `Bearer ${access_token}` }
        })

        if (!searchRes.ok) throw new Error(`FatSecret Search Error: ${await searchRes.text()}`)
        const searchData = await searchRes.json()

        console.log(JSON.stringify(searchData, null, 2))
    } catch (e) {
        console.error(e)
    }
}
run()
