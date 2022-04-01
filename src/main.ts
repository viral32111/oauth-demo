const handleRequest = async ( request: Request ) => {
	return new Response( "Hello World!", {
		status: 200,
		statusText: "OK",
		headers: {
			"Content-Type": "text/plain"
		}
	} )
}

addEventListener( "fetch", ( event: FetchEvent ) => {
	event.respondWith( handleRequest( event.request ) )
} )
