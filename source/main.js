import { getSessionIdentifier, createSession, fetchSession, storeSession } from "./session.js"

const BASE_URL = "https://discord.com/api/v9"
const REDIRECT_URI = "https://oauth-demo.viral32111.workers.dev/discord"

const sha1 = async ( value ) => {
	const digest = await crypto.subtle.digest( "SHA-1", new TextEncoder().encode( value ) )
	return Array.from( new Uint8Array( digest ) ).map( byte => byte.toString( 16 ).padStart( 2, "0" ) ).join( "" )
}

const handleRequest = async ( request ) => {
	const requestUrl = new URL( request.url );

	let sessionIdentifier = await getSessionIdentifier( request.headers ), sessionHeader = {}
	if ( !sessionIdentifier ) [ sessionIdentifier, sessionHeader ] = await createSession( request.headers )

	const session = await fetchSession( sessionIdentifier )

	if ( request.method === "GET" && requestUrl.pathname === "/" ) {
		if ( !( "user_id" in session ) ) return new Response( "You are not signed in!\n\nVisit /login to sign in via Discord.", {
			status: 401,
			headers: Object.assign( { "Content-Type": "text/plain" }, sessionHeader )
		} )

		return new Response( "ID: " + session[ "user_id" ] + "\nName:" + session[ "user_name" ] + "#" + session[ "user_discriminator" ], {
			status: 200,
			headers: Object.assign( { "Content-Type": "text/plain" }, sessionHeader )
		} )
	}

	if ( request.method === "GET" && requestUrl.pathname === "/login" ) return new Response( null, {
		status: 307,
		headers: Object.assign( {
			"Location": BASE_URL + "/oauth2/authorize?" + new URLSearchParams( {
				"client_id": CLIENT_ID,
				"redirect_uri": REDIRECT_URI,
				"response_type": "code",
				"scope": "identify",
				"prompt": "none",
				"state": await sha1( sessionIdentifier )
			} ).toString()
		}, sessionHeader )
	} )

	if ( request.method === "GET" && requestUrl.pathname === "/discord" && request.search !== "" ) {
		if ( requestUrl.searchParams.get( "state" ) !== await sha1( sessionIdentifier ) ) return new Response( "State mismatch!", {
			status: 400,
			headers: { "Content-Type": "text/plain" }
		} )

		const code = requestUrl.searchParams.get( "code" )
		if ( !code ) return new Response( "Missing code!", {
			status: 400,
			headers: { "Content-Type": "text/plain" }
		} )

		const tokenResponse = await fetch( BASE_URL + "/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: new URLSearchParams( {
				"client_id": CLIENT_ID,
				"client_secret": CLIENT_SECRET,
				"grant_type": "authorization_code",
				"code": code,
				"redirect_uri": REDIRECT_URI,
			} ).toString()
		} )

		if ( !tokenResponse.ok ) return new Response( await tokenResponse.text(), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		} )

		const tokenData = await tokenResponse.json()

		const authorizationResponse = await fetch( BASE_URL + "/oauth2/@me", {
			method: "GET",
			headers: {
				"Authorization": tokenData[ "token_type" ] + " " + tokenData[ "access_token" ]
			}
		} )

		if ( !authorizationResponse.ok ) return new Response( await authorizationResponse.text(), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		} )

		const authorizationData = await authorizationResponse.json()

		session[ "user_id" ] = authorizationData[ "user" ][ "id" ]
		session[ "user_name" ] = authorizationData[ "user" ][ "username" ]
		session[ "user_discriminator" ] = authorizationData[ "user" ][ "discriminator" ]
		session[ "user_avatar" ] = authorizationData[ "user" ][ "avatar" ]

		await storeSession( sessionIdentifier, session )

		return new Response( null, {
			status: 307,
			headers: {
				"Location": "/"
			}
		} )

		/*return new Response( await authorizationResponse.text(), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		} )*/

		// Revoke token?
	}

	return new Response( null, { status: 404 } )
}

addEventListener( "fetch", ( event ) => {
	event.respondWith( handleRequest( event.request ) )
} )
