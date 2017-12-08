<?php
	/**
	 * Note: This file is intended to be publicly accessible.
	 * Reference: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
	 */

	header("Service-Worker-Allowed: /");
	header("Content-Type: application/javascript");
	header("X-Robots-Tag: none");
	echo "importScripts('https://cdn.onesignal.com/sdks/OneSignalSDK.js');";
?>