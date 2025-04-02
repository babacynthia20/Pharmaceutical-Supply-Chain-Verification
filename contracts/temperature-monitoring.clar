;; Temperature Monitoring Contract
;; This contract ensures proper storage conditions for medications

;; Define data maps
(define-map temperature-logs
  { batch-id: (string-ascii 20), timestamp: uint }
  {
    temperature: int,
    humidity: uint,
    recorder: principal,
    location: (string-ascii 50)
  }
)

(define-map temperature-thresholds
  { product-type: (string-ascii 20) }
  {
    min-temp: int,
    max-temp: int,
    min-humidity: uint,
    max-humidity: uint
  }
)

;; Define error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-NOT-FOUND u102)
(define-constant ERR-INVALID-THRESHOLD u104)

;; Define contract owner
(define-data-var contract-owner principal tx-sender)

;; Check if caller is contract owner
(define-private (is-contract-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Set temperature thresholds for a product type
(define-public (set-temperature-thresholds
    (product-type (string-ascii 20))
    (min-temp int)
    (max-temp int)
    (min-humidity uint)
    (max-humidity uint)
  )
  (begin
    (asserts! (is-contract-owner) (err ERR-NOT-AUTHORIZED))
    (asserts! (< min-temp max-temp) (err ERR-INVALID-THRESHOLD))
    (asserts! (< min-humidity max-humidity) (err ERR-INVALID-THRESHOLD))

    (ok (map-set temperature-thresholds
      { product-type: product-type }
      {
        min-temp: min-temp,
        max-temp: max-temp,
        min-humidity: min-humidity,
        max-humidity: max-humidity
      }
    ))
  )
)

;; Record temperature reading
(define-public (record-temperature
    (batch-id (string-ascii 20))
    (temperature int)
    (humidity uint)
    (location (string-ascii 50))
  )
  (begin
    (map-set temperature-logs
      { batch-id: batch-id, timestamp: block-height }
      {
        temperature: temperature,
        humidity: humidity,
        recorder: tx-sender,
        location: location
      }
    )
    (ok true)
  )
)

;; Check if temperature is within threshold
(define-read-only (is-temperature-valid
    (product-type (string-ascii 20))
    (temperature int)
    (humidity uint)
  )
  (match (map-get? temperature-thresholds { product-type: product-type })
    threshold (and
                (>= temperature (get min-temp threshold))
                (<= temperature (get max-temp threshold))
                (>= humidity (get min-humidity threshold))
                (<= humidity (get max-humidity threshold))
              )
    false
  )
)

;; Get temperature log
(define-read-only (get-temperature-log (batch-id (string-ascii 20)) (timestamp uint))
  (map-get? temperature-logs { batch-id: batch-id, timestamp: timestamp })
)

;; Get product thresholds
(define-read-only (get-product-thresholds (product-type (string-ascii 20)))
  (map-get? temperature-thresholds { product-type: product-type })
)

