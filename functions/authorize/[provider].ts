interface Env {
	KV: KVNamespace;
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

	return new Response( JSON.stringify( {
		statusCode: 0,
		providerName: providerName,
	} ), {
		status: 200,
		headers: {
			"Content-Type": "application/json; charset=utf-8",
		}
	} )
}
