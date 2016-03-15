import {FilterBasedAccessor} from "./FilterBasedAccessor";
import {ObjectState} from "../state";

import {
	FilterBucket,
	HistogramBucket,
	RangeQuery,
	BoolMust
} from "../query";


export interface RangeAccessorOptions {
	title:string
	id:string
	min:number
	max:number
  interval?: number
	field:string,
	loadBuckets?:boolean
}

export class RangeAccessor extends FilterBasedAccessor<ObjectState> {
	options:any
	state = new ObjectState({})

	constructor(key, options:RangeAccessorOptions){
    super(key, options.id)
    this.options = options
  }

	buildSharedQuery(query) {
		if (this.state.hasValue()) {
			let val:any = this.state.getValue()
			let rangeFilter = RangeQuery(this.options.field,{
        gte:val.min, lte:val.max
      })
			let selectedFilter = {
				name:this.translate(this.options.title),
				value:`${val.min} - ${val.max}`,
				id:this.options.id,
				remove:()=> {
					this.state = this.state.clear()
				}
			}

			return query
				.addFilter(this.key, rangeFilter)
				.addSelectedFilter(selectedFilter)

		}

		return query
	}

	getBuckets(){
    return this.getAggregations(
      [this.key, this.key, "buckets"], []
    )
  }

  getInterval(){
    if (this.options.interval) {
      return this.options.interval
    }
    return Math.ceil((this.options.max - this.options.min) / 20)
  }

  buildOwnQuery(query) {
		if(this.options.loadBuckets){
			let otherFilters = query.getFiltersWithoutKeys(this.key)
			let filters = BoolMust([
				otherFilters,
				RangeQuery(this.options.field,{
					gte:this.options.min, lte:this.options.max
				})
			])
			query = query.setAggs(FilterBucket(
				this.key,
				filters,
				HistogramBucket(this.key, this.options.field, {
					"interval":this.getInterval(),
					"min_doc_count":0,
					"extended_bounds":{
						"min":this.options.min,
						"max":this.options.max
					}
				})
			))
		}
    return query;
  }
}
