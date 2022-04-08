const SESSION_COOKIE_NAME = "Session"

export const fetchSession = ( identifier ) => SESSION.get( identifier, { type: "json" } )
export const storeSession = ( identifier, session ) => SESSION.put( identifier, JSON.stringify( session ) )

export const ensureSession = async ( headers ) => {
	if ( headers.has( "cookie" ) ) {
		const cookies = {}

		headers.get( "cookie" ).split( ";" ).forEach( cookie => {
			const [ name, value ] = cookie.split( "=" );
			cookies[ name.trim() ] = value.trim();
		} )

		if ( "__Secure-" + SESSION_COOKIE_NAME in cookies ) {
			const identifier = cookies[ "__Secure-" + SESSION_COOKIE_NAME ]
			const session = await fetchSession( identifier )

			if ( session ) return {
				identifier: identifier,
				data: session,
				header: null
			}
		}
	}

	const identifier = crypto.randomUUID().replaceAll( "-", "" )
	const session = {}

	await storeSession( identifier, session )

	return {
		identifier: identifier,
		data: session,
		header: {
			"Set-Cookie": [
				"__Secure-" + SESSION_COOKIE_NAME + "=" + identifier,
				"Domain=" + headers.get( "host" ),
				"Path=/",
				"Secure",
				"HttpOnly",
				"SameSite=Lax"
			].join( "; " )
		}
	}
}

export const eraseSession = async ( identifier, headers ) => {
	await SESSION.delete( identifier )

	return [
		"__Secure-" + SESSION_COOKIE_NAME + "=",
		"Expires=Thu, 01 Jan 1970 00:00:00 GMT",
		"Domain=" + headers.get( "host" ),
		"Path=/"
	].join( "; " )
}
