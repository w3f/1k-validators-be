{{/* Returns the full backend domain */}}
{{- define "tov-backend.backend-domain" -}}
tov-backend.{{ .Values.domain }}
{{- end }}

{{/* Returns the name of the TLS secret */}}
{{- define "tov-backend.tls-secret-name" -}}
{{ .Release.Name }}-tls
{{- end }}