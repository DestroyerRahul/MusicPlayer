import { queryParams } from "$lib/utils/utils";
import {
	CONTEXT_DEFAULTS,
	API_BASE_URL,
	WEB_REMIX_KEY,
	USER_AGENT,
	ENDPOINT_NAMES,
	ANDROID_KEY,
	API_ORIGIN,
} from "./constants";
import type { Body, APIEndpoints, Context } from "./types";
import { Endpoints } from "./types";
import type {
	ArtistEndpointParams,
	PlayerEndpointParams,
	PlaylistEndpointParams,
	NextEndpointParams,
	PlaylistEndpointContinuation,
	SearchEndpointParams,
	RelatedEndpointParams,
} from "./_base";

type Nullable<T> = T | null;
type IHeaders = Record<string, string>;

/** Helper function to build a request body
	consisting of Context and params of type `T` */
function buildRequestBody<T>(context: Context, params: Body<T>) {
	return { context, ...params };
}

/**
 * Builds a YouTube Music API request.
 * @param endpoint
 * @param options
 * @returns {Promise<Response>} A promise consisting of a Response
 */
export function buildRequest<
	T extends ArtistEndpointParams | PlayerEndpointParams | PlaylistEndpointParams | NextEndpointParams,
>(
	endpoint: keyof APIEndpoints,
	{
		context,
		params,
		continuation,
		headers = {},
	}: {
		context: Partial<Context>;
		params: T | {};
		continuation?: Nullable<PlaylistEndpointContinuation>;
		headers?: Nullable<IHeaders>;
	},
): Promise<Response | null> {
	const ctx = { ...CONTEXT_DEFAULTS, ...context };
	const body = params;
	if (!headers) headers = {};
	switch (endpoint) {
		case "artist":
			return artistRequest(ctx, body as ArtistEndpointParams);
		case "next":
			return nextRequest(ctx, body as NextEndpointParams);
		case "player":
			return playerRequest(ctx, body as PlayerEndpointParams);
		case "playlist":
			return browseRequest(ctx, body as PlaylistEndpointParams, continuation, headers);
		case "related":
			return browseRequest(ctx, body as RelatedEndpointParams, null, null);
		case "browse":
			return browseRequest(ctx, body as unknown as RelatedEndpointParams, null, null);
		case "home":
			return browseRequest(ctx, body as PlaylistEndpointParams, continuation, headers);
		case "search":
			return searchRequest(ctx, body as SearchEndpointParams, continuation as SearchEndpointParams);
		default:
			return Promise.resolve(null);
	}
}

/**
 * Request handler for the `next` YouTube Music API Endpoint
 *
 * @template T extends NextEndpointParams
 * @param {Context} context
 * @param {T} params
 * @returns {*}
 */
function nextRequest<T extends NextEndpointParams>(context: Context, params: T) {
	const body = buildRequestBody(context, params);
	const request = fetch(API_BASE_URL + ENDPOINT_NAMES.next + "?key=" + WEB_REMIX_KEY, {
		body: JSON.stringify(body),
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Origin: "https://music.youtube.com",

			"x-youtube-client-name": "67",
			"x-youtube-client-version": "1.20221212.01.0",
			"X-Goog-Visitor-Id": `${context?.client?.visitorData}`,
			"User-Agent": USER_AGENT,
		},
	});
	return request;
}

/**
 * Search YouTube Music API Endpoint
 *
 * @template T extends SearchEndpointParams
 * @param {Context} context
 * @param {T} params
 * @param {?Nullable<SearchEndpointParams>} [continuation]
 * @returns {*}
 */
function searchRequest<T extends SearchEndpointParams>(
	context: Context,
	params: T,
	continuation?: Nullable<SearchEndpointParams>,
) {
	const body = buildRequestBody(context, params);
	const request = fetch(
		API_BASE_URL +
			ENDPOINT_NAMES.search +
			"?" +
			(continuation ? queryParams(continuation) + `&sp=EgWKAQIIAWoKEAMQBBAKEAkQBQ%3D%3D&` : "") +
			`key=${WEB_REMIX_KEY}`,
		{
			body: JSON.stringify(body),
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				Origin: "https://music.youtube.com",
				"User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
			},
		},
	);
	return request;
}

/**
 * Generic browse YouTube Music API request
 *
 * @template T
 * @param {Context} context
 * @param {T} params
 * @param {?Nullable<PlaylistEndpointContinuation>} [continuation]
 * @param {IHeaders} [headers={}]
 * @returns
 */
function browseRequest<T = PlayerEndpointParams | ArtistEndpointParams | RelatedEndpointParams>(
	context: Context,
	params: T,
	continuation?: Nullable<PlaylistEndpointContinuation>,
	headers: Nullable<IHeaders> = {},
): Promise<Response> {
	const body = buildRequestBody<T>(context as Context, params);

	// if continuation is defined, querystringify it
	const request = fetch(
		API_BASE_URL +
			Endpoints.Browse +
			"?" +
			(continuation ? queryParams(continuation) + "&" : "") +
			`key=${WEB_REMIX_KEY}`,
		{
			headers: Object.assign(
				{
					Host: "music.youtube.com",
					"User-Agent": USER_AGENT,
					"Content-Type": "application/json; charset=utf-8",
					"x-origin": "https://music.youtube.com",
					"x-goog-visitor-id": context["client"]["visitorData"] || "",
					"x-youtube-client-name": "67",
					"x-youtube-client-version": "1.20221212.01.0",
					Origin: "https://music.youtube.com",
				},
				headers,
			),
			body: JSON.stringify(body),
			method: "POST",
		},
	);
	return request;
}

/**
 * Player request endpoint for the YouTube Music API.
 * Fetches the stream URL's from YouTube.
 *
 * @template T extends PlayerEndpointParams
 * @param {Context} context
 * @param {T} params
 * @returns {*}
 */
function playerRequest<T extends PlayerEndpointParams>(context: Context, params: T) {
	const body = buildRequestBody(context as Context, params);

	const request = fetch(API_BASE_URL + ENDPOINT_NAMES.player + `?key=${ANDROID_KEY}`, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Origin: API_ORIGIN,
		},
		body: JSON.stringify(body),
		method: "POST",
	});
	return request;
}

/**
 * Artist YouTube Music API request.
 * @internal Only use on backend
 *
 * @template T extends ArtistEndpointParams
 * @param {Context} context
 * @param {T} body
 * @returns {*}
 */
function artistRequest<T extends ArtistEndpointParams>(context: Context, body: T) {
	const reqBody = buildRequestBody(context as Context, body);

	const request = fetch(API_BASE_URL + ENDPOINT_NAMES.artist + `?key=${WEB_REMIX_KEY}`, {
		headers: {
			Origin: API_ORIGIN,
			"x-origin": API_ORIGIN,
			"User-Agent": USER_AGENT,
		},
		method: "POST",
		body: JSON.stringify(reqBody),
	});
	return request;
}
