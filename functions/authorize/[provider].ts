interface Env {
	KV: KVNamespace
	DISCORD_CLIENT_ID: string
	DISCORD_CLIENT_SECRET: string
}

const validProviders = [ "discord" ]

export const onRequest: PagesFunction<Env> = async ( context ) => {
	const providerName = context.params.provider

	if ( typeof( providerName ) !== "string" ) return new Response( JSON.stringify( {
		statusCode: 1
	} ), {
		status: 400,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
		}
	} )

	if ( !validProviders.includes( providerName ) ) return new Response( JSON.stringify( {
		statusCode: 2
	} ), {
		status: 400,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
		}
	} )

	const redirectUrl = new URL( `/redirect/${ providerName }`, context.request.url )
	const authorizationUrl = new URL( `https://discord.com/api/oauth2/authorize?client_id=${ context.env.DISCORD_CLIENT_ID }&redirect_uri=${ redirectUrl.toString() }&response_type=code&scope=email%20identify` )

	return new Response( JSON.stringify( {
		statusCode: 0,
		providerName: providerName,
	} ), {
		status: 307,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Location": authorizationUrl.toString(),
		}
	} )

}
