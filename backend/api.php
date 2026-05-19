<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../.env.php';

$pdo = new PDO(
    "mysql:host={$_ENV['DB_HOST']};dbname={$_ENV['DB_NAME']};charset=utf8mb4",
    $_ENV['DB_USER'],
    $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Ensure table exists
$pdo->exec("
    CREATE TABLE IF NOT EXISTS chesspawn_games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id VARCHAR(6) NOT NULL UNIQUE,
        game_data TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $gameId = strtoupper(trim($_GET['game_id'] ?? ''));

    if ($action === 'get') {
        if (!preg_match('/^[A-Z0-9]{6}$/', $gameId)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid game_id']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT game_data FROM chesspawn_games WHERE game_id = ?");
        $stmt->execute([$gameId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Not found']);
            exit;
        }
        echo json_encode(['game_data' => $row['game_data']]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
    }
    exit;
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    $action  = $body['action'] ?? '';
    $gameId  = strtoupper(trim($body['game_id'] ?? ''));
    $data    = $body['game_data'] ?? '';

    if (!preg_match('/^[A-Z0-9]{6}$/', $gameId)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid game_id']);
        exit;
    }

    // Validate game_data is valid JSON
    if (json_decode($data) === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid game_data']);
        exit;
    }

    if ($action === 'create') {
        $stmt = $pdo->prepare(
            "INSERT INTO chesspawn_games (game_id, game_data) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE game_data = VALUES(game_data)"
        );
        $stmt->execute([$gameId, $data]);
        echo json_encode(['ok' => true]);
    } elseif ($action === 'update') {
        $stmt = $pdo->prepare(
            "UPDATE chesspawn_games SET game_data = ? WHERE game_id = ?"
        );
        $stmt->execute([$data, $gameId]);
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['error' => 'Game not found']);
            exit;
        }
        echo json_encode(['ok' => true]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown action']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
