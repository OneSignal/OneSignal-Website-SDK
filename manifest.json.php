<?php
  /**
   * Note: This file is intended to be publicly accessible.
   * Reference: https://developers.google.com/web/updates/2015/03/push-notifications-on-the-open-web#add_a_web_app_manifest
  */

	header("Content-Type: application/json");
	header("X-Robots-Tag: none");
	$gcm_sender_id = preg_replace('/[^0-9]/', '', $_GET["gcm_sender_id"]);
?>
{
  "start_url": "/",
  "gcm_sender_id": "<?php echo (empty($gcm_sender_id) ? '482941778795' : $gcm_sender_id); ?>",
  "gcm_user_visible_only": true
}