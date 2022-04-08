const SESSION_COOKIE_NAME = "Session"

export const getSessionIdentifier = async ( headers ) => {
	if ( headers.has( "cookie" ) ) {
		const cookies = {}

		headers.get( "cookie" ).split( ";" ).forEach( cookie => {
			const [ name, value ] = cookie.split( "=" );
			cookies[ name.trim() ] = value.trim();
		} )

		if ( "__Secure-" + SESSION_COOKIE_NAME in cookies ) {
			const identifier = cookies[ "__Secure-" + SESSION_COOKIE_NAME ]

			if ( await SESSION.get( identifier ) ) return identifier
		}
	}

	return false
}

export const createSession = async ( headers ) => {
	const identifier = crypto.randomUUID().replaceAll( "-", "" )

	await SESSION.put( identifier, JSON.stringify( {} ) )

	return [ identifier, {
		"Set-Cookie": [
			"__Secure-" + SESSION_COOKIE_NAME + "=" + identifier,
			"Domain=" + headers.get( "host" ),
			"Path=/",
			"Secure",
			"HttpOnly",
			"SameSite=Lax"
		].join( "; " )
	} ]
}

export const fetchSession = async ( identifier ) => {
	const a = JSON.parse( await SESSION.get( identifier ) )
	console.log( "FETCH", identifier, a )
	return a
}

export const storeSession = async ( identifier, session ) => {
	const b = JSON.stringify( session )
	await SESSION.put( identifier, b )
	console.log( "STORE", identifier, b )
}
