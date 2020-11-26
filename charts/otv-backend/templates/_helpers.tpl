{{/* Returns the name of the TLS secret */}}
{{- define "otv-backend.tls-secret-name" -}}
{{ .Release.Name }}-tls
{{- end }}