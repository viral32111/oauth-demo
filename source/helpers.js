export const sha1 = async ( value ) => {
	const digest = await crypto.subtle.digest( "SHA-1", new TextEncoder().encode( value ) )
	return Array.from( new Uint8Array( digest ) ).map( byte => byte.toString( 16 ).padStart( 2, "0" ) ).join( "" )
}

export const isSignedIn = ( session ) => {
	return "user_id" in session && session[ "user_id" ] !== ""
}
