You will implement use case logics from @src/domain/parse-ensaios-use-case.ts

The first thing is to read a file on storage bucket root 

the file name is "locations.json" and its content is similar will have this structure:
{
    "version": "1.0.0",
    "locations": [
        {
            "id": "louveira__sp",
            "displayName": "Jardim Lago Azul",
            "city": "Louveira - SP",
            "schedule": {
                "hours": "19:30",
                "weekDay": "saturday",
                "weekIndex": "0",
                "label": "1° Sáb 19:30"
            },
            "nextDate": "2025-10-04"
        },
        {
          "id": "jundiai__sp",
          "displayName": "Vila Arens",
          "city": "Jundiaí - SP",
          "schedule": {
            "hours": "19:30",
            "weekDay": "saturday",
            "weekIndex": "0",
            "label": "1° Sáb 19:30"
          },
          "nextDate": "2025-10-04"
        }
    ]
}

This use case will read locations.json and map each location.

For each location, you will calculate the next date of this location based on current date. 

On finish, you will update locations.json with the new values.

Create methods on @src/lib/utils/date.ts if  needed