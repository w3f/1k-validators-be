{{/* Returns the full backend domain */}}
{{- define "1k-validators-be.backend-domain" -}}
1k-validators-be.{{ .Values.domain }}
{{- end }}

{{/* Returns the name of the TLS secret */}}
{{- define "1k-validators-be.tls-secret-name" -}}
{{ .Release.Name }}-tls
{{- end }}