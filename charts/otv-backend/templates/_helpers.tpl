{{/* Returns the full backend domain */}}
{{- define "otv-backend.backend-domain" -}}
otv-backend.{{ .Values.domain }}
{{- end }}

{{/* Returns the name of the TLS secret */}}
{{- define "otv-backend.tls-secret-name" -}}
{{ .Release.Name }}-tls
{{- end }}