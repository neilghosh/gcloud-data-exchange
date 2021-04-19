# gcloud-data-exchange

## Run
```
python3 -m http.server
```

## Export data from BQ
```
SELECT
  symbol,
  timestamp,
  open,
  high,
  low,
  CLOSE,
  TOTTRDQTY
FROM
  `demoneil.nse_data. nse_historical_data_unique`
WHERE timestamp > '2021-01-01'
AND timestamp < '2021-04-17'
ORDER BY timestamp;
```

## Demonstration of 
* Google OAuth flow to grant permissions to google cloud resources (Cloud Platform Readonly and Datastore)
* Upload CSV file to populate datastore 
* Read datastore using dynamically formed GQL query

![2021-03-15](screenshots/ss-2021-03-15.png)
