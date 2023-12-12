{{/* Returns the name of the TLS secret */}}
{{- define "otv-backend.tls-secret-name" -}}
{{ .Release.Name }}-tls
{{- end }}

{{/* Returns the release name of the core service */}}
{{- define "otv-backend.core-release-name" -}}
{{ .Release.Name }}-core
{{- end }}

{{/* Returns the release name of the gateway service */}}
{{- define "otv-backend.gateway-release-name" -}}
{{ .Release.Name }}-gateway
{{- end }}

{{/* Returns the release name of the telemetry service */}}
{{- define "otv-backend.telemetry-release-name" -}}
{{ .Release.Name }}-telemetry
{{- end }}

{{/* Returns the release name of the worker service */}}
{{- define "otv-backend.worker-release-name" -}}
{{ .Release.Name }}-worker
{{- end }}