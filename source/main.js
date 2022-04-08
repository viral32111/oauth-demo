import { ensureSession, storeSession, eraseSession } from "./session.js"
import { sha1, isSignedIn } from "./helpers.js"

const API_URL = "https://discord.com/api/v9"
const CDN_URL = "https://cdn.discordapp.com"
const REDIRECT_URI = "https://oauth-demo.viral32111.workers.dev/discord"

const TEMPLATES = {
	HTML: ( body ) => `<!DOCTYPE html>\n<head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive,noimageindex,nosnippet,nositelinkssearchbox"><title>OAuth Demo</title><link rel="icon" href="data:,"><style>* { font-family: monospace; }</style></head>\n<body>${body}</body>`,

	Home: ( name, discriminator, id, avatar ) => TEMPLATES.HTML( `Hello <strong>${name}<em>#${discriminator}</em></strong>!<br>Your user identifier is <strong>${id}</strong>.<br>Your avatar is <strong><a href="${CDN_URL}/avatars/${id}/${avatar}.png?size=512">${avatar}</a></strong><br><br>Has this information changed since your last visit? <a href="/refresh">Refresh it</a>.<br><br>Visit <a href="/logout">/logout</a> to sign out & remove this session.` ),

	NotSignedIn: () => TEMPLATES.HTML( `You are not signed in!<br><br>Visit <a href="/login">/login</a> to sign in via Discord.` ),
	AlreadySignedIn: () => TEMPLATES.HTML( `You are already signed in!<br><br>Visit <a href="/">/</a> to return home.` ),

	SignOutSuccess: () => TEMPLATES.HTML( `You have been signed out!<br><br>Visit <a href="/">/</a> to return home.` ),
	SignOutImpossible: () => TEMPLATES.HTML( `You cannot sign out without signing in first!<br><br>Visit <a href="/">/</a> to return home.` ),

	RefreshSuccess: () => TEMPLATES.HTML( `Your user information has been refreshed!<br><br>Visit <a href="/">/</a> to return home.` ),
	RefreshImpossible: () => TEMPLATES.HTML( `You cannot refresh information without signing in first!<br><br>Visit <a href="/">/</a> to return home.` )
}

const updateUserInformation = async ( token, session ) => {
	const informationResponse = await fetch( API_URL + "/oauth2/@me", {
		method: "GET",
		headers: {
			"Authorization": "Bearer " + token
		}
	} )

	if ( !informationResponse.ok ) return new Response( await informationResponse.text(), {
		status: 500,
		headers: { "Content-Type": "application/json" }
	} )

	const informationData = await informationResponse.json()
	session.data[ "user_id" ] = informationData[ "user" ][ "id" ]
	session.data[ "user_name" ] = informationData[ "user" ][ "username" ]
	session.data[ "user_discriminator" ] = informationData[ "user" ][ "discriminator" ]
	session.data[ "user_avatar" ] = informationData[ "user" ][ "avatar" ]

	await storeSession( session.identifier, session.data )
}

const handleRequest = async ( request ) => {
	const requestUrl = new URL( request.url )
	const session = await ensureSession( request.headers ) // TO-DO: Executing this on a 404 page is a waste of KV.

	if ( request.method === "GET" && requestUrl.pathname === "/" ) {
		if ( !isSignedIn( session.data ) ) return new Response( TEMPLATES.NotSignedIn(), {
			status: 401,
			headers: Object.assign( { "Content-Type": "text/html" }, session.header )
		} )

		return new Response( TEMPLATES.Home(
			session.data[ "user_name" ],
			session.data[ "user_discriminator" ],
			session.data[ "user_id" ],
			session.data[ "user_avatar" ]
		), {
			status: 200,
			headers: Object.assign( { "Content-Type": "text/html" } )
		} )
	}

	if ( request.method === "GET" && requestUrl.pathname === "/login" ) {
		if ( isSignedIn( session.data ) ) return new Response( TEMPLATES.AlreadySignedIn(), {
			status: 400,
			headers: Object.assign( { "Content-Type": "text/html" } )
		} )

		return new Response( null, {
			status: 307,
			headers: Object.assign( {
				"Location": API_URL + "/oauth2/authorize?" + new URLSearchParams( {
					"client_id": CLIENT_ID,
					"redirect_uri": REDIRECT_URI,
					"response_type": "code",
					"scope": "identify",
					"prompt": "none",
					"state": await sha1( session.identifier )
				} ).toString()
			}, session.header )
		} )
	}

	if ( request.method === "GET" && requestUrl.pathname === "/logout" ) {
		if ( !isSignedIn( session.data ) ) return new Response( TEMPLATES.SignOutImpossible(), {
			status: 400,
			headers: Object.assign( { "Content-Type": "text/html" } )
		} )

		const cookieHeader = await eraseSession( session.identifier, request.headers )

		return new Response( TEMPLATES.SignOutSuccess(), {
			status: 200,
			headers: {
				"Set-Cookie": cookieHeader,
				"Content-Type": "text/html"
			}
		} )
	}

	if ( request.method === "GET" && requestUrl.pathname === "/refresh" ) {
		if ( !isSignedIn( session.data ) ) return new Response( TEMPLATES.RefreshImpossible(), {
			status: 400,
			headers: Object.assign( { "Content-Type": "text/html" } )
		} )

		await updateUserInformation( session.data[ "token" ], session )

		return new Response( TEMPLATES.RefreshSuccess(), {
			status: 200,
			headers: {
				"Content-Type": "text/html"
			}
		} )
	}

	if ( request.method === "GET" && requestUrl.pathname === "/discord" && request.search !== "" ) {
		if ( requestUrl.searchParams.get( "state" ) !== await sha1( session.identifier ) ) return new Response( "State mismatch!", {
			status: 400,
			headers: { "Content-Type": "text/plain" }
		} )

		const code = requestUrl.searchParams.get( "code" )
		if ( !code ) return new Response( "Missing code!", {
			status: 400,
			headers: { "Content-Type": "text/plain" }
		} )

		const tokenResponse = await fetch( API_URL + "/oauth2/token", {
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
		session.data[ "access_token" ] = tokenData[ "access_token" ]
		session.data[ "refresh_token" ] = tokenData[ "refresh_token" ]
		// TO-DO: Store the access/refresh tokens in KV with the expiration date

		await updateUserInformation( tokenData[ "access_token" ], session )

		return new Response( null, {
			status: 307,
			headers: {
				"Location": "/"
			}
		} )

		// TO-DO: Implement a way to revoke the access/refresh tokens if the user "deletes" their account
	}

	return new Response( null, { status: 404 } )
}

addEventListener( "fetch", ( event ) => {
	// Web browsers are fucking retarded
	if ( event.request.url.endsWith( "/favicon.ico" ) ) {
		return event.respondWith( new Promise( resolve => resolve( new Response( null, { status: 410 } ) ) ) )
	}

	event.respondWith( handleRequest( event.request ) )
} )
