<?php
//require "../anti-ddos-lite/anti-ddos-lite.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

header("Content-Type: application/json");


$mysqli = new mysqli("localhost", "meteopine", "zKC7JbyMGrHb", "my_meteopine") or die(json_encode(null));

$idStazione = 0;
$JSONroot = null;

if (isset($_GET['id'])) {
	$idStazione = $_GET['id'];
	if ((isset($_GET['di']) and isset($_GET['df']))    or     (isset($_GET['last']) and $_GET['last'] == "true")) {
		$tsInizio = null;
		$tsFine = null;

		if (isset($_GET['di']) and isset($_GET['df'])) {
			$tsInizio = $_GET['di'];
			$tsFine = $_GET['df'];
		}

		if (isset($_GET['last'])) {
			$stmt = $mysqli->prepare("SELECT DateTime FROM dati_stazioni WHERE idStation = ? ORDER by DateTime DESC LIMIT 1");
			$stmt->bind_param("i", $idStazione);
			$stmt->execute();
			$resultQueryLastTS = $stmt->get_result();
			if (!$resultQueryLastTS) die(json_encode(null));
			$row = $resultQueryLastTS->fetch_row();
			$tsInizio = $tsFine = $row[0];
		}

		$stmt = $mysqli->prepare("SELECT * FROM dati_stazioni  WHERE DateTime >= ? AND DateTime <= ? AND idStation = ? ORDER by DateTime ASC");
		$stmt->bind_param("ssi", $tsInizio, $tsFine, $idStazione);
		$stmt->execute();
		$resultQueryDati = $stmt->get_result();

		if (!$resultQueryDati) die(json_encode(null));
		$numRighe = $resultQueryDati->num_rows;

		$JSONroot["estrazione"] = array();

		for ($i = 0; $i < $numRighe; ++$i) {
			$JSONroot["estrazione"][] =  $resultQueryDati->fetch_assoc();
		}

		if ($JSONroot["estrazione"][0] == null) $JSONroot["estrazione"] = null;
	} elseif (isset($_GET['daily'])) {
		$stmt = $mysqli->prepare("SELECT min(Temperature) as min_temp, round(avg(Temperature),1) as avg_temp, max(Temperature) as max_temp, round(min(Humidity),0) as min_hum, round(avg(Humidity),0) as avg_hum, round(max(Humidity),0) as max_hum, max(WindSpeed) as max_wspeed, round(avg(WindSpeed),1) as avg_wspeed, max(WindGust) as max_wgust, (SELECT WindBearingSymbol FROM dati_stazioni WHERE idStation = ? AND DateTime >= ? AND DateTime <= ? GROUP BY WindBearingSymbol ORDER BY count(WindBearingSymbol) DESC LIMIT 1) as dominant_dir, max(RainRate) as max_rrate, min(Pressure) as min_press, round(avg(Pressure),2) as avg_press, max(Pressure) as max_press  FROM dati_stazioni WHERE idStation = ? AND DateTime >= ? and DateTime <= ?");

		$date_start = date("Y-m-d") . " 00:00:00"; //'2022-10-01 00:00:00';
		$date_end = date("Y-m-d H:i:s"); //'2022-10-01 00:00:00';

		$stmt->bind_param("ississ",  $idStazione, $date_start, $date_end, $idStazione, $date_start, $date_end);
		$stmt->execute();
		$resultQueryDati = $stmt->get_result();

		if (!$resultQueryDati) die(json_encode(null));
		$numRighe = $resultQueryDati->num_rows;

		$JSONroot = null;

		for ($i = 0; $i < $numRighe; ++$i) {
			$JSONroot =  $resultQueryDati->fetch_assoc();
		}

		//if ($JSONroot["estrazione"][0] == null) $JSONroot["estrazione"] = null;
	} else {
		$JSONroot["estrazione"] = null;
	}
}

echo json_encode($JSONroot);
